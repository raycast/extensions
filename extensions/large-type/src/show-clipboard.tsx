import { useEffect, useState } from "react";
import { Clipboard, showToast, Toast } from "@raycast/api";
import DisplayText from "./display-text";

export default function ShowClipboard() {
  const [clipboardText, setClipboardText] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClipboardContent() {
      try {
        const content = await Clipboard.readText();
        setClipboardText(content ?? "No text in clipboard");
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error reading clipboard",
          message: String(error),
        });
      }
    }

    fetchClipboardContent();
  }, []);

  return <DisplayText inputText={clipboardText} />;
}
