import { List, getSelectedFinderItems, getSelectedText, showToast, Toast } from "@raycast/api";
import { PipeCommands, PipeInput } from "./pipe-to-command";
import { useState, useEffect } from "react";

async function getSelection(): Promise<PipeInput> {
  try {
    const files = await getSelectedFinderItems();
    if (files.length == 0) throw new Error("No file selected!");
    return { type: "file", content: files.map((file) => file.path).join("\n") };
  } catch {
    const text = await getSelectedText();
    return { type: "text", content: text };
  }
}

export default function PipeSelectionToPipeCommand() {
  const [selection, setSelection] = useState<PipeInput>();
  useEffect(() => {
    getSelection()
      .then(setSelection)
      .catch((e) => {
        showToast(Toast.Style.Failure, (e as Error).message);
      });
  }, []);
  return selection ? <PipeCommands input={selection} /> : <List isLoading />;
}
