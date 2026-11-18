import { Action, ActionPanel, Detail, Form, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { constants } from "node:fs";
import { copyFile } from "node:fs/promises";
import path from "node:path";
import { useEffect, useState } from "react";
import { codeBlock } from "../lib/markdown";
import { generateQr } from "../lib/qr";
import { qrImageDataUrl, qrPreviewMarkdown } from "../lib/qr-preview";
import { UrlInput } from "./url-input";

function SaveImage({ imagePath }: { imagePath: string }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string>();
  return (
    <Form
      navigationTitle="Save QR Code as PNG"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save PNG"
            onSubmit={async (values: { folder: string[] }) => {
              if (!values.folder[0]) {
                setError("Select a destination folder.");
                return;
              }
              const target = path.join(values.folder[0], `qrcode-${Date.now()}.png`);
              try {
                await copyFile(imagePath, target, constants.COPYFILE_EXCL);
                await showToast({ style: Toast.Style.Success, title: "QR Code Saved", message: target });
                pop();
              } catch (cause) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Unable to Save Image",
                  message: (cause as Error).message,
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.FilePicker
        id="folder"
        title="Destination Folder"
        canChooseDirectories
        canChooseFiles={false}
        allowMultipleSelection={false}
        error={error}
        onChange={() => setError(undefined)}
      />
      <Form.Description text="Saves a 512 × 512 PNG with the current timestamp in its filename." />
    </Form>
  );
}

function EditUrlAction({ url }: { url: string }) {
  const { push } = useNavigation();
  return (
    <Action
      title="Edit URL"
      icon={Icon.Pencil}
      onAction={() =>
        push(
          <UrlInput title="Enter URL" initialValue={url} onSubmit={(input) => push(<QrCodePreview url={input} />)} />,
        )
      }
    />
  );
}

export function QrCodePreview({ url, allowEdit = true }: { url: string; allowEdit?: boolean }) {
  const [result, setResult] = useState<{ url: string; imagePath?: string; imageDataUrl?: string; error?: string }>();
  const { push } = useNavigation();

  useEffect(() => {
    let active = true;
    generateQr(url)
      .then(async (imagePath) => {
        const imageDataUrl = await qrImageDataUrl(imagePath);
        if (active) setResult({ url, imagePath, imageDataUrl });
      })
      .catch((cause: Error) => {
        if (active) setResult({ url, error: cause.message });
      });
    return () => {
      active = false;
    };
  }, [url]);

  const current = result?.url === url ? result : undefined;
  const imagePath = current?.imagePath;
  const imageDataUrl = current?.imageDataUrl;
  const error = current?.error;

  return (
    <Detail
      navigationTitle="URL QR Code"
      isLoading={!imageDataUrl && !error}
      markdown={
        imageDataUrl
          ? qrPreviewMarkdown(imageDataUrl, url)
          : error
            ? `Unable to generate QR code: ${error}\n\n${codeBlock(url)}`
            : "Generating QR code…"
      }
      actions={
        <ActionPanel>
          {imagePath && (
            <>
              <Action.CopyToClipboard title="Copy QR Code Image" content={{ file: imagePath }} />
              <Action
                title="Save PNG"
                icon={Icon.Download}
                onAction={() => push(<SaveImage imagePath={imagePath} />)}
              />
              <Action.OpenWith title="Open Image" path={imagePath} />
              <Action.CopyToClipboard title="Copy URL" content={url} />
            </>
          )}
          {allowEdit && <EditUrlAction url={url} />}
        </ActionPanel>
      }
    />
  );
}
