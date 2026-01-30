import {
  Detail,
  showToast,
  Toast,
  Clipboard,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { performOCR } from "./utils";

export default function Command() {
  const [text, setText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function processClipboard() {
      try {
        const { file } = await Clipboard.read();

        if (!file) {
          await showToast({
            style: Toast.Style.Failure,
            title: "No image in clipboard",
            message: "Please copy an image first.",
          });
          setIsLoading(false);
          return;
        }

        // Raycast returns a temp file path for the clipboard image
        await showToast({
          style: Toast.Style.Animated,
          title: "Performing OCR...",
        });

        const result = await performOCR(file);

        if (result) {
          setText(result);
          await Clipboard.copy(result);
          await showToast({
            style: Toast.Style.Success,
            title: "OCR Completed",
            message: "Result copied to clipboard",
          });
        } else {
          setText("No text detected.");
          await showToast({
            style: Toast.Style.Failure,
            title: "No text found",
          });
        }
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to read clipboard",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    }

    processClipboard();
  }, []);

  return (
    <Detail
      isLoading={isLoading}
      markdown={text || "*Waiting for image processing...*"}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard content={text} />
        </ActionPanel>
      }
    />
  );
}
