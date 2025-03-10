import { Clipboard, Detail, Action, ActionPanel, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import { tmpdir } from "os";
import fs from "fs";
import { generateQRCode, getQRCodePath } from "./utils";

export default function Command() {
  const [clipboardText, setClipboardText] = useState<string>();
  const [qrData, setQrData] = useState<string>();
  const tempPath = `${tmpdir()}/raycast-qrcode.png`;

  useEffect(() => {
    (async () => {
      const text = await Clipboard.readText();
      if (text) {
        setClipboardText(text);
        const dataUrl = await generateQRCode(text);
        setQrData(dataUrl);
        if (dataUrl) {
          const base64 = dataUrl.split(",")[1];
          try {
            await fs.promises.writeFile(tempPath, base64, "base64");
            // Copy the image file to the clipboard (as image, not text)
            await Clipboard.copy({ file: tempPath });
            await showToast(Toast.Style.Success, "QR Code Copied", "Image copied to clipboard");
          } catch (error) {
            await showToast(Toast.Style.Failure, "Copy Failed", String(error));
          }
        }
      } else {
        await showToast(Toast.Style.Failure, "No text found", "Clipboard is empty or not text");
      }
    })();
  }, []);

  return (
    <Detail
      isLoading={!qrData}
      markdown={qrData ? `![qrcode](${qrData}?raycast-height=355)` : "Generating QR Code..."}
      actions={
        qrData && clipboardText ? (
          <ActionPanel>
            <Action.CopyToClipboard title="Copy QR Code Image" content={{ file: tempPath }} />
            <Action
              title="Save QR Code to Downloads"
              // Use Command+Shift+D for saving the image
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              onAction={async () => {
                const filePath = getQRCodePath(clipboardText);
                try {
                  await fs.promises.copyFile(tempPath, filePath);
                  await showToast(Toast.Style.Success, "QR Code Saved", `Saved to ${filePath}`);
                  open(filePath);
                } catch (error: unknown) {
                  showToast(
                    Toast.Style.Failure,
                    "Error Saving File",
                    error instanceof Error ? error.message : String(error)
                  );
                }
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
