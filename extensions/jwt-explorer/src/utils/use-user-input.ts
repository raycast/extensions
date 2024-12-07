import { Clipboard, getSelectedText } from "@raycast/api";
import { useEffect, useState } from "react";

async function getSelection() {
  try {
    await getSelectedText(); // This is a workaround to get the actual selected text; otherwise, it can return the previously selected text.
    return await getSelectedText();
  } catch (error) {
    return "";
  }
}

export default function useUserInput() {
  const [text, setText] = useState<string | undefined>(undefined);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const selectedText = await getSelection();
      const clipboardText = await Clipboard.readText();
      if (selectedText) {
        setReady(true);
        setText(selectedText);
      } else if (clipboardText) {
        setReady(true);
        setText(clipboardText);
      } else {
        setReady(true);
        setText("");
      }
    })();
  }, []);

  return { ready, text };
}
