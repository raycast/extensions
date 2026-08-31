import { Clipboard } from "@raycast/api";
import { execFile as execFileCallback } from "node:child_process";
import { unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { AfterPaste, PasteMode } from "./preferences";

const execFile = promisify(execFileCallback);

function escapeAppleScriptString(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\r", "\\r")
    .replaceAll("\n", "\\n")
    .replaceAll("\t", "\\t");
}

async function copyPngImage(file: string): Promise<void> {
  const escapedFile = escapeAppleScriptString(file);
  await execFile("/usr/bin/osascript", [
    "-e",
    `set the clipboard to (read (POSIX file "${escapedFile}") as «class PNGf»)`,
  ]);
}

async function pastePngImage(file: string): Promise<void> {
  await copyPngImage(file);
  await execFile("/usr/bin/osascript", ["-e", 'tell application "System Events" to keystroke "v" using command down']);
}

export async function pasteScreenshot(file: string, pasteMode: PasteMode): Promise<void> {
  if (pasteMode === "file") {
    await Clipboard.paste({ file });
    return;
  }

  await pastePngImage(file);
}

export async function removeAfterPaste(file: string, pasteMode: PasteMode, afterPaste: AfterPaste): Promise<void> {
  if (afterPaste === "save" || pasteMode === "file") {
    return;
  }

  await unlink(file).catch(() => undefined);
}
