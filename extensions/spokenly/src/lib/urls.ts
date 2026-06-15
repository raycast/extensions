import { open } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export function buildStartURL(promptId: string): string {
  // URL-encode just to be safe; UUIDs don't need it but quick command IDs might
  // someday contain special chars.
  return `spokenly://start?prompt_id=${encodeURIComponent(promptId)}`;
}

export async function openSpokenlyURL(url: string): Promise<void> {
  await open(url);
}

// macOS NSEvent modifier flag bits
const MOD_FLAGS = {
  CAPS_LOCK: 0x010000,
  SHIFT: 0x020000,
  CONTROL: 0x040000,
  OPTION: 0x080000,
  COMMAND: 0x100000,
} as const;

export interface ShortcutKeys {
  keyCode: number;
  rawFlags: number;
}

export function describeShortcut(keys: ShortcutKeys): string[] {
  const mods: string[] = [];
  if (keys.rawFlags & MOD_FLAGS.CONTROL) mods.push("control");
  if (keys.rawFlags & MOD_FLAGS.OPTION) mods.push("option");
  if (keys.rawFlags & MOD_FLAGS.SHIFT) mods.push("shift");
  if (keys.rawFlags & MOD_FLAGS.COMMAND) mods.push("command");
  return mods;
}

export async function simulateShortcut(keys: ShortcutKeys): Promise<void> {
  const mods = describeShortcut(keys);
  const using =
    mods.length > 0
      ? ` using {${mods.map((m) => `${m} down`).join(", ")}}`
      : "";
  const script = `tell application "System Events" to key code ${keys.keyCode}${using}`;
  await runAppleScript(script);
}
