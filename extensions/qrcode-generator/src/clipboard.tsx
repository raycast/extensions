import { Clipboard, showToast, Toast, ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { generateQRCode, getQRCodePath } from "./utils";
import fs from "fs";

export default function Command() {
  const [qrData, setQrData] = useState<string>();
  const [clipboardText, setClipboardText] = useState<string>("");

  useEffect(() => {
    (async () => {
      const clipboard = await Clipboard.readText();
      setClipboardText(clipboard || "");
      const qrData = await generateQRCode({ URL: clipboard, preview: true });
      setQrData(qrData);
      showToast(Toast.Style.Success, "Success", "Created QR Code");
    })();
  }, []);

  async function handleSave() {
    if (!qrData) return;
    try {
      // qrData is a data URL: data:image/png;base64,...
      const base64 = qrData.split(",")[1];
      const buffer = Buffer.from(base64, "base64");
      const filePath = getQRCodePath(clipboardText, "png");
      fs.writeFileSync(filePath, buffer);
      await showToast(Toast.Style.Success, "Saved to Downloads", filePath);
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to Save", error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <Detail
      isLoading={!qrData}
      markdown={`![qrcode](${qrData || ""}?raycast-height=350)`}
      actions={
        <ActionPanel>
          <Action title="Save to Downloads" onAction={handleSave} shortcut={{ modifiers: ["cmd"], key: "s" }} />
        </ActionPanel>
      }
    />
  );
}
