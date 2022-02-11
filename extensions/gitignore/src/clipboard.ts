import fs from "fs/promises";
import { Clipboard, popToRoot, showHUD } from "@raycast/api";
import { GitignoreFile } from "./types";
clearInterval;

export async function exportClipboard(selected: GitignoreFile[]) {
  const contents = [];
  for (const gitignore of selected) {
    contents.push(`# ---- ${gitignore.name} ----\n${await (await fs.readFile(gitignore.path)).toString()}`);
  }
  await showHUD("Copied to Clipboard");
  await Clipboard.copy(contents.join("\n"));
  await popToRoot();
}
