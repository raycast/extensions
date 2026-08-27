import { Clipboard, closeMainWindow, getFrontmostApplication, showHUD } from "@raycast/api";
import { AirDroppedFile, describeTransfer, escapePathForTerminal } from "./airdropped";

// Terminals only accept text through a simulated paste, so pasting a file into
// them means pasting its path (which CLI tools like Claude Code then read).
const TERMINAL_BUNDLE_IDS = new Set([
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "com.mitchellh.ghostty",
  "net.kovidgoyal.kitty",
  "org.alacritty",
  "io.alacritty",
  "com.github.wez.wezterm",
  "dev.warp.Warp-Stable",
  "co.zeit.hyper",
]);

async function isFrontmostAppTerminal(): Promise<boolean> {
  try {
    const frontmost = await getFrontmostApplication();
    return frontmost.bundleId !== undefined && TERMINAL_BUNDLE_IDS.has(frontmost.bundleId);
  } catch {
    return false;
  }
}

/**
 * Pastes the given files into the frontmost app: as real files normally, or as
 * shell-escaped paths when the frontmost app is a terminal.
 */
export async function pasteAirDroppedFiles(files: AirDroppedFile[]): Promise<void> {
  const terminal = await isFrontmostAppTerminal();
  await closeMainWindow();
  if (terminal) {
    await Clipboard.paste({ text: files.map((file) => escapePathForTerminal(file.path)).join(" ") });
  } else {
    for (const file of files) {
      await Clipboard.paste({ file: file.path });
    }
  }
  await showHUD(`Pasted ${describeTransfer(files)}`);
}
