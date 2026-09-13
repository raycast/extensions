import { LaunchProps } from "@raycast/api";
import { showShortcuts } from "./lib/keysi";
import { showLockedToast } from "./lib/locked";
import { readTier } from "./lib/tier";

/**
 * Show Shortcuts.
 *
 * The optional argument is what makes this worth more than Keysi's own
 * hotkey: `⌘-space keysi save` lands on the Save row of whatever app you
 * were in, without ever seeing the full panel.
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.ShowShortcuts }>) {
  const tier = readTier();
  if (!tier.unlocked) {
    await showLockedToast(tier);
    return;
  }
  const query = (props.fallbackText ?? props.arguments?.query ?? "").trim();
  await showShortcuts(query.length > 0 ? query : undefined);
}
