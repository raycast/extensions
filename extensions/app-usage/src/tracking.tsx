import { Action, ActionPanel, environment, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ClearDataAction } from "./clear";
import { isCollecting } from "./core/sampler";
import { createStore } from "./core/store";

/**
 * Collect Usage ticks once a minute. This leaves room for Raycast's scheduling
 * tolerance and for the first tick after waking from sleep.
 */
const STALE_AFTER_MS = 5 * 60_000;

export async function loadCollecting(): Promise<boolean> {
  const state = await createStore(environment.supportPath).readState();
  return isCollecting(state, Date.now(), STALE_AFTER_MS);
}

/**
 * Shown in place of an empty report while Collect Usage is not running, which is
 * where a fresh Store install starts. Without it the views would wait for data
 * that never comes.
 */
export function TrackingOffEmptyView({ onCleared }: { onCleared: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Clock}
      title="Tracking is off"
      description="Open the Collect Usage command once (or enable it in the extension preferences) to start tracking. Data appears a few minutes later."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <ClearDataAction onCleared={onCleared} />
        </ActionPanel>
      }
    />
  );
}
