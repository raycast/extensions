// Must stay the first import: guarantees the Web Crypto global that @p00f/core
// encrypts with before anything else in the command is evaluated.
import "./lib/webcrypto";
import { Clipboard, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { readFile, stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { createClipboardPoof, type ClipboardImage } from "./lib/clipboard";
import { createDefaultsFromPreferences } from "./lib/preferences";

const http = (input: string, init?: RequestInit) => fetch(input, init);

const execFileP = promisify(execFile);

// macOS only: Raycast's Clipboard.read() does not surface image bytes, so we
// shell out to osascript. The AppleScript reads «class PNGf» (PNG pasteboard),
// writes it to a temp file, and returns "ok" iff a PNG was actually present.
// We then load the file and unlink it. Any failure (no image, permission,
// osascript missing) returns null so createClipboardPoof falls through cleanly.
async function readClipboardImage(): Promise<ClipboardImage | null> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const tmpPath = join(
    tmpdir(),
    `poof-clipboard-${timestamp}-${process.pid}.png`,
  );
  // Path is derived from tmpdir + timestamp + pid, none of which contain a
  // double quote in practice, but escape defensively before interpolating.
  const scriptPath = tmpPath.replace(/"/g, '\\"');
  const script = [
    "try",
    `  set outFile to open for access POSIX file "${scriptPath}" with write permission`,
    "  set eof of outFile to 0",
    "  write (the clipboard as «class PNGf») to outFile",
    "  close access outFile",
    '  return "ok"',
    "on error",
    "  try",
    `    close access POSIX file "${scriptPath}"`,
    "  end try",
    '  return "no-image"',
    "end try",
  ].join("\n");

  try {
    const { stdout } = await execFileP("osascript", ["-e", script]);
    if (stdout.trim() !== "ok") {
      await unlink(tmpPath).catch(() => {});
      return null;
    }
    const bytes = new Uint8Array(await readFile(tmpPath));
    await unlink(tmpPath).catch(() => {});
    if (bytes.length === 0) return null;
    return {
      bytes,
      mime: "image/png",
      filename: `screenshot-${timestamp}.png`,
    };
  } catch {
    await unlink(tmpPath).catch(() => {});
    return null;
  }
}

export default async function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Creating Poof",
  });
  try {
    await createClipboardPoof(
      {
        http,
        clipboard: Clipboard,
        readClipboard: () =>
          Clipboard.read() as Promise<{
            text?: string;
            file?: string;
            html?: string;
          }>,
        statPath: async (path) => {
          const s = await stat(path);
          return { isFile: s.isFile(), isDirectory: s.isDirectory() };
        },
        readFile: async (path) => new Uint8Array(await readFile(path)),
        readClipboardImage,
      },
      createDefaultsFromPreferences(preferences),
    );
    toast.style = Toast.Style.Success;
    toast.title = preferences.pasteAfterCreate
      ? "Poof link pasted"
      : "Poof link copied";
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Could not create Poof";
    toast.message = error instanceof Error ? error.message : String(error);
  }
}
