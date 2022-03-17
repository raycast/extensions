import { List, getSelectedFinderItems, getSelectedText, showToast, Toast } from "@raycast/api";
import { PipeCommands, PipeInput } from "./pipe-to-command";
import { useState, useEffect } from "react";
import { existsSync } from "fs";

async function getSelection(): Promise<PipeInput> {
  try {
    const files = await getSelectedFinderItems();
    if (files.length == 0) throw new Error("No file selected!");
    return { type: "file", content: files[0].path, origin: "selection" };
  } catch (e) {
    const content = await getSelectedText();
    const type = existsSync(content) ? "file" : "text";
    return { type, content, origin: "selection" };
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
