import { LaunchProps, showHUD } from "@raycast/api";
import { showShortcuts } from "./lib/keysi";
import { builtinSheetDirs } from "./lib/prefs";
import { atLeast, FREE_SHOW_SINCE, installedVersion } from "./lib/version";

/**
 * Show Shortcuts.
 *
 * The optional argument is what makes this worth more than Keysi's own
 * hotkey: `⌘-space keysi save` lands on the Save row of whatever app you
 * were in, without ever seeing the full panel.
 *
 * Free, so no tier check: it opens Keysi's overlay, which is free however
 * it is reached. Keysi itself agrees — `keysi://show` is not one of the
 * commands it refuses on the free tier, from 1.0.21 on. An older Keysi
 * refuses it without Pro and opens License settings instead, so that case
 * gets a line saying an update fixes it. Still opened either way: with Pro,
 * the old app shows the panel just fine.
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.ShowShortcuts }>) {
  const query = (props.fallbackText ?? props.arguments?.query ?? "").trim();
  const version = installedVersion(builtinSheetDirs());
  if (version && !atLeast(version, FREE_SHOW_SINCE)) {
    await showHUD(`Show Shortcuts is free from Keysi ${FREE_SHOW_SINCE} — use Check for Updates… in Keysi's menu`);
  }
  await showShortcuts(query.length > 0 ? query : undefined);
}
