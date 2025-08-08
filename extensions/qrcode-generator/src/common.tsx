import { Clipboard, getSelectedText, showToast, Toast, ActionPanel, Action, Detail } from "@raycast/api";
import { useEffect, useState } from "react";
import { generateQRCode, getQRCodePath } from "./utils";
import fs from "fs";

export default function Common({ from }: { from: "clipboard" | "selection" }) {
  const [qrData, setQrData] = useState<string>();
  const [sourceText, setSourceText] = useState<string>("");

  useEffect(() => {
    (async () => {
      const currentText = from === "clipboard" ? await Clipboard.readText() : await getSelectedText();

      setSourceText(currentText || "");

      if (!currentText?.trim()) {
        await showToast(Toast.Style.Failure, "Failed", "No text found");
        return;
      }

      const qrData = await generateQRCode({ URL: currentText, preview: true });
      setQrData(qrData);

      // show origin text in Toast message
      showToast(Toast.Style.Success, "Create Success", currentText);
    })();
  }, []);

  async function handleSave() {
    if (!qrData) return;
    try {
      // qrData is a data URL: data:image/png;base64,...
      const base64 = qrData.split(",")[1];
      const buffer = Buffer.from(base64, "base64");
      const filePath = getQRCodePath(sourceText, "png");
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
