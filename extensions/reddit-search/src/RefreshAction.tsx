import { Action, Icon, Keyboard } from "@raycast/api";

/**
 * Re-runs the current search, bypassing the results cache.
 *
 * Cached results can be up to a few minutes old, so this is the escape hatch
 * when you need what Reddit has right now. It spends a request against the
 * ~1/minute budget, so it is deliberately a discrete action rather than
 * something that happens automatically.
 */
export default function RefreshAction({ onRefresh }: { onRefresh: () => void }) {
  return (
    <Action
      title="Refresh"
      icon={Icon.ArrowClockwise}
      shortcut={Keyboard.Shortcut.Common.Refresh}
      onAction={onRefresh}
    />
  );
}
