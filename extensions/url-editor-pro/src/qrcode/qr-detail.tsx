import { Action, ActionPanel, Detail, showToast, Toast, open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState } from "react";
import path from "path";
import fs from "fs";
import os from "os";
import QRCode from "qrcode";
import { ParseResult } from "../types";
import { renderQrMarkdown } from "../utils/qrcode";

interface QrDetailProps {
  url: ParseResult | null;
}

export function QrDetail({ url }: QrDetailProps) {
  const [qr, setQr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function generateQr() {
      if (!url?.href) {
        setIsLoading(false);
        return;
      }
      try {
        const dataUrl = await QRCode.toDataURL(url.href);
        setQr(dataUrl);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
        showFailureToast(error, { title: "Failed to generate QR code" });
      } finally {
        setIsLoading(false);
      }
    }
    generateQr();
  }, [url?.href]);

  async function handleSaveQr() {
    if (!url || !qr) return;
    try {
      const base64 = qr.replace(/^data:image\/png;base64,/, "");
      const filePath = path.join(
        os.homedir(),
        "Downloads",
        `qr_${url.protocol?.split(":")[0]}_${url.hostname}_${new Date().toISOString().split("T")[0].replace(/-/g, "_")}.png`,
      );
      fs.writeFileSync(filePath, base64, "base64");
      showToast({ style: Toast.Style.Success, title: "Saved to Downloads", message: filePath });
      await open(filePath);
    } catch (error) {
      console.error(error);
      showFailureToast(error, { title: "Failed to save QR code" });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={
        url?.href && qr ? renderQrMarkdown(qr, url.href) : isLoading ? "Generating QR code..." : "No URL provided"
      }
      actions={
        url?.href && qr ? (
          <ActionPanel>
            <Action.CopyToClipboard content={url.href} title="Copy URL" />
            <Action title="Save Qr Code to Downloads" onAction={handleSaveQr} />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
