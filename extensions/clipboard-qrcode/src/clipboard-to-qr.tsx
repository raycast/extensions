import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  showToast,
  Toast,
} from "@raycast/api";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

export default function Command() {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [clipText, setClipText] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const text = await Clipboard.readText();
      if (!text) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Clipboard is empty",
        });
        setIsLoading(false);
        return;
      }
      setClipText(text);
      const dataUrl = await QRCode.toDataURL(text, { width: 280, margin: 1 });
      setQrDataUrl(dataUrl);
      setIsLoading(false);
    })();
  }, []);

  const markdown = qrDataUrl
    ? `![QR Code](${qrDataUrl})\n\n---\n\n**Content:**\n\n${clipText}`
    : !isLoading
      ? "No text in clipboard."
      : "";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        qrDataUrl ? (
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Qr Code Content"
              content={clipText}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}
