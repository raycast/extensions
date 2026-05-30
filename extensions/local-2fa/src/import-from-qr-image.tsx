import { Action, ActionPanel, Form, Toast, showToast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { useState } from "react";
import { PNG } from "pngjs";
import decodeQR from "qr/decode.js";
import { parseGoogleMigrationUrl } from "./google-migration";
import { upsertAccount } from "./storage";
import { parseOtpauthUrl, stableAccountId } from "./totp";

type FormValues = {
  imagePaths: string[];
};

async function decodeQrFromPng(imagePath: string): Promise<string> {
  const normalizedPath = imagePath.startsWith("file://")
    ? fileURLToPath(imagePath)
    : imagePath;

  if (!existsSync(normalizedPath)) {
    throw new Error(`Selected file does not exist: ${normalizedPath}`);
  }

  if (extname(normalizedPath).toLowerCase() !== ".png") {
    throw new Error(
      `Only PNG images are supported (got "${extname(normalizedPath) || "no extension"}"). Re-export the QR as PNG.`,
    );
  }

  const fileBuffer = await readFile(normalizedPath);

  let png: PNG;
  try {
    png = PNG.sync.read(fileBuffer);
  } catch (error) {
    const details = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(`Could not parse PNG image${details}`);
  }

  try {
    return decodeQR({
      width: png.width,
      height: png.height,
      data: new Uint8ClampedArray(png.data),
    });
  } catch (error) {
    const details = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(
      `No QR detected in image${details}. Ensure the QR is clearly visible and not cropped.`,
    );
  }
}

async function importFromDecodedPayload(payload: string): Promise<number> {
  let imported = 0;
  const trimmed = payload.trim();

  if (trimmed.startsWith("otpauth-migration://")) {
    const accounts = parseGoogleMigrationUrl(trimmed);
    for (const item of accounts) {
      await upsertAccount({
        id: stableAccountId(item),
        ...item,
        createdAt: new Date().toISOString(),
      });
      imported++;
    }
  } else if (trimmed.startsWith("otpauth://")) {
    const item = parseOtpauthUrl(trimmed);
    await upsertAccount({
      id: stableAccountId(item),
      ...item,
      createdAt: new Date().toISOString(),
    });
    imported++;
  }

  if (imported === 0) {
    throw new Error(
      "No otpauth or otpauth-migration payload was found in the QR image.",
    );
  }

  return imported;
}

export default function Command() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(values: FormValues) {
    try {
      setIsLoading(true);
      const paths = values.imagePaths ?? [];
      if (!paths.length) {
        throw new Error("Select at least one PNG image file.");
      }

      let count = 0;
      for (const path of paths) {
        const payload = await decodeQrFromPng(path.trim());
        count += await importFromDecodedPayload(payload);
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Import Complete",
        message: `${count} account(s) imported`,
      });
    } catch (error) {
      await showFailureToast(error, { title: "Import Failed" });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Import from QR Image"
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Description text="Pick one or more local PNG images containing a QR with otpauth:// or otpauth-migration:// payload. macOS screenshots are PNG by default." />
      <Form.FilePicker
        id="imagePaths"
        title="QR Images (PNG)"
        allowMultipleSelection
        canChooseDirectories={false}
        canChooseFiles
      />
    </Form>
  );
}
