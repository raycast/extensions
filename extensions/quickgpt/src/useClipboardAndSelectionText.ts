import { useState, useEffect } from "react";
import { Clipboard } from "@raycast/api";
import { getSelectedText } from "@raycast/api";

function useClipboardAndSelectionText() {
  const [clipboardText, setClipboardText] = useState("");
  const [selectionText, setSelectionText] = useState("");

  useEffect(() => {
    Promise.all([Clipboard.readText().catch(() => ""), getSelectedText().catch(() => "")])
      .then(([clipboard, selection]) => {
        setClipboardText(clipboard ?? "");
        setSelectionText(selection);
      })
      .catch((/*error*/) => {
        // console.error("Error:", error);
      });
  }, []);

  return { clipboardText, selectionText };
}

export default useClipboardAndSelectionText;
