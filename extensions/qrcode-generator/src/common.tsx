import { Clipboard, getSelectedText, showToast, Toast, ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { generateQRCode, getQRCodePath } from "./utils";
import fs from "fs";


export default function Common({ from }: { from: "clipboard" | "selection" }) {
  const [qrData, setQrData] = useState<string>();
  const [clipboardText, setClipboardText] = useState<string>("");


  useEffect(() => {
    (async () => {
      const clipboard = from === 'clipboard' ? await Clipboard.readText() : await getSelectedText();

      setClipboardText(clipboard || "");

      if (!clipboard?.trim()) {
        await showToast(Toast.Style.Failure, "Failed", "No text found");
        return;
      }

      const qrData = await generateQRCode({ URL: clipboard, preview: true });
      setQrData(qrData);

      // show origin text in Toast message 
      showToast(Toast.Style.Success, "Success", clipboard);
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
