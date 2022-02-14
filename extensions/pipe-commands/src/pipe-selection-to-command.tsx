import { environment, getSelectedFinderItems, getSelectedText, render, showToast, Toast } from "@raycast/api";
import { readdirSync } from "fs";
import { PipeCommands, PipeInput } from "./pipe-to-command";
import { copyAssetsCommands } from "./utils";

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

async function main() {
  if (readdirSync(environment.supportPath).length == 0) {
    await copyAssetsCommands();
  }

  try {
    const selection = await getSelection();
    render(<PipeCommands input={selection} />);
  } catch (e: unknown) {
    showToast(Toast.Style.Failure, (e as Error).message);
  }
}

main();
