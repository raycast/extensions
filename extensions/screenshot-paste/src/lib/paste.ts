import { Clipboard } from "@raycast/api";
import { execFile as execFileCallback } from "node:child_process";
import { unlink } from "node:fs/promises";
import { promisify } from "node:util";
import { AfterPaste, PasteMode } from "./preferences";

const execFile = promisify(execFileCallback);
const CMD_V_JXA = `ObjC.import('Cocoa');
const down = $.CGEventCreateKeyboardEvent($.nil, 9, true);
$.CGEventSetFlags(down, $.kCGEventFlagMaskCommand);
const up = $.CGEventCreateKeyboardEvent($.nil, 9, false);
$.CGEventSetFlags(up, $.kCGEventFlagMaskCommand);
$.CGEventPost($.kCGHIDEventTap, down);
$.CGEventPost($.kCGHIDEventTap, up);`;

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
  try {
    await execFile("/usr/bin/osascript", [
      "-e",
      `set the clipboard to (read (POSIX file "${escapedFile}") as «class PNGf»)`,
    ]);
  } catch (error) {
    const stderr = (error as { stderr?: unknown }).stderr;
    const firstLine = typeof stderr === "string" ? stderr.trim().split(/\r?\n/, 1)[0] : undefined;
    throw new Error(["Could not put the image on the clipboard.", firstLine].filter(Boolean).join(" "));
  }
}

async function pastePngImage(file: string): Promise<void> {
  await copyPngImage(file);
  try {
    await execFile("/usr/bin/osascript", ["-l", "JavaScript", "-e", CMD_V_JXA]);
  } catch {
    throw new Error(
      "Pressing Cmd-V failed. Allow Raycast in System Settings > Privacy & Security > Accessibility (required by the Image paste mode).",
    );
  }
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
