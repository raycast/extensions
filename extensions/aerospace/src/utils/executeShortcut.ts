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
  const prev = await aerospace("list-modes", "--current");
  await aerospace("mode", shortcut.mode);
  await executeShortcut(shortcut.key);
  await aerospace("mode", prev);
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
    ${keyCode ? `key code ${keyCode}` : `keystroke "${key}"`} using {${modifiers}}
end`;

  try {
    await runAppleScript(script);
    await showHUD(`Executed: ${shortcutKey}`);
  } catch {
    await showHUD(`Failed: ${shortcutKey}`);
  }
}
