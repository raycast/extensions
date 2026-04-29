import { Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";

type SelectionState = {
  text: string;
  isLoading: boolean;
};

export function useSelectionOrClipboard(): SelectionState {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchClipboardText() {
      setIsLoading(true);
      try {
        const clipboardText = await Clipboard.readText();
        setText(clipboardText ?? "");
      } catch {
        setText("");
      } finally {
        setIsLoading(false);
      }
    }

    fetchClipboardText();
  }, []);

  return { text, isLoading };
}
