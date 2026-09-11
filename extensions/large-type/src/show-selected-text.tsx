import { useEffect, useState } from "react";
import { getSelectedText, showToast, Toast } from "@raycast/api";
import DisplayText from "./display-text";

export default function ShowSelectedText() {
  const [selectedText, setSelectedText] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSelectedText() {
      try {
        const text = await getSelectedText();
        setSelectedText(text || "No text selected");
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Error reading selected text",
          message: String(error),
        });
      }
    }

    fetchSelectedText();
  }, []);

  return <DisplayText inputText={selectedText} />;
}
