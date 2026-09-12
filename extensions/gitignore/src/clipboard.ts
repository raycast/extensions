import { Clipboard, popToRoot, showHUD } from "@raycast/api";
import { GitignoreFile } from "./types";
import { generateContents } from "./utils";

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
