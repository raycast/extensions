import fs from "fs/promises";
import { Clipboard, popToRoot, showHUD } from "@raycast/api";
import { GitignoreFile } from "./types";

async function generateContents(selected: GitignoreFile[]): Promise<string> {
  const contents = [];
  for (const gitignore of selected) {
    contents.push(`# ---- ${gitignore.name} ----\n${await (await fs.readFile(gitignore.path)).toString()}`);
  }
  return contents.join("\n");
}

export async function exportClipboard(selected: GitignoreFile[]) {
  await showHUD("Copied to Clipboard");
  await Clipboard.copy(await generateContents(selected));
  await popToRoot();
}

export async function exportPaste(selected: GitignoreFile[]) {
  await showHUD("Pasted to App");
  await Clipboard.paste(await generateContents(selected));
  await popToRoot();
}
