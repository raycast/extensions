import { LaunchProps, showHUD } from "@raycast/api";
import { formatShortcut, isPressable } from "./keys";
import { pressShortcut } from "./lib/press";
import { SHORTCUTS } from "./shortcuts";

/**
 * Presses one Bricks shortcut, chosen by argument. Meant for quicklinks with their own hotkey
 * (create one from Search Bricks Shortcuts with ⌘⇧K).
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.PressShortcut }>) {
  const shortcut = SHORTCUTS.find((s) => s.id === props.arguments.shortcut);
  if (!shortcut || !isPressable(shortcut)) {
    await showHUD(`Unknown Bricks shortcut "${props.arguments.shortcut}"`);
    return;
  }
  await pressShortcut(shortcut, formatShortcut(shortcut, "mac"));
}
