import { showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { mapKeyToKeyCode } from "./keys";
import { aerospace } from "./aerospace";
import { Shortcut } from "./config";

const MODIFIER_MAP: Record<string, string> = {
  cmd: "command down",
  ctrl: "control down",
  alt: "option down",
  shift: "shift down",
};

export async function executeShortcutInMode(shortcut: Shortcut) {
  // `aerospace mode` exits 0 even for a mode that isn't defined, which would leave the user
  // stranded in a mode with no bindings. The config on disk can also be ahead of what the
  // running server loaded, so only switch between modes the server itself reports.
  // Older builds lack `list-modes --current`; if either query fails, run in the active mode.
  const [current, modes] = await Promise.all([
    aerospace("list-modes", "--current").catch(() => null),
    aerospace("list-modes")
      .then((out) =>
        out
          .split("\n")
          .map((mode) => mode.trim())
          .filter(Boolean),
      )
      .catch(() => null),
  ]);

  const canSwitch =
    current !== null &&
    modes !== null &&
    current !== shortcut.mode &&
    modes.includes(shortcut.mode) &&
    modes.includes(current);

  if (!canSwitch) {
    await executeShortcut(shortcut.key);
    return;
  }

  await aerospace("mode", shortcut.mode);
  await executeShortcut(shortcut.key);
  await aerospace("mode", current).catch(() =>
    showHUD(`Warning: stuck in "${shortcut.mode}" mode, failed to restore "${current}"`),
  );
}

function escapeForAppleScript(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export async function executeShortcut(shortcutKey: string) {
  const parts = shortcutKey.split("-");
  const key = parts.pop()!;
  const modifiers = parts
    .map((mod) => MODIFIER_MAP[mod.toLowerCase()] || "")
    .filter(Boolean)
    .join(", ");

  const keyCode = mapKeyToKeyCode(key);
  const script = `
tell application "System Events"
    ${keyCode ? `key code ${keyCode}` : `keystroke "${escapeForAppleScript(key)}"`} using {${modifiers}}
end`;

  try {
    await runAppleScript(script);
    await showHUD(`Executed: ${shortcutKey}`);
  } catch {
    await showHUD(`Failed: ${shortcutKey}`);
  }
}
