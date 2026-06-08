import type { DiscordController } from "../../domain/control";
import { isDiscordRunning } from "../system/discord-probe";
import { runOsascript } from "../system/osascript";
import { getPreferences, shortcutForAction } from "../system/preferences";
import { ShortcutController } from "./shortcut-controller";

export { PlaceholderController } from "./placeholder-controller";
export { ShortcutController } from "./shortcut-controller";

/** Read the current frontmost app name (empty string if it can't be determined). */
async function getFrontmostApp(): Promise<string> {
  const result = await runOsascript(
    ['tell application "System Events" to get name of first process whose frontmost is true'],
    { timeoutMs: 3000 },
  );
  return result.ok ? result.stdout : "";
}

/** Construct the production shortcut controller wired to the real system probes and preferences. */
export function createShortcutController(): DiscordController {
  const prefs = getPreferences();
  return new ShortcutController({
    getShortcut: (action) => shortcutForAction(prefs, action),
    isDiscordRunning,
    runOsascript,
    getFrontmostApp,
  });
}
