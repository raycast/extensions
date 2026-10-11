import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { ClearDataAction } from "./clear";

/**
 * Shown when there is nothing at all to report.
 *
 * A Store install leaves Collect Usage's background refresh off until the command
 * is opened once or enabled in preferences, and Raycast offers no way to ask
 * which it is. Guessing from the age of the last sample misfires after sleep or a
 * clear, so this says how to turn tracking on without claiming that it is off.
 */
export function NothingRecordedEmptyView({ onCleared }: { onCleared: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Clock}
      title="Nothing recorded yet"
      description="App Usage records the focused app once a minute in the background. If nothing appears within a few minutes, open the Collect Usage command once (or enable it in the extension preferences) to start tracking."
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <ClearDataAction onCleared={onCleared} />
        </ActionPanel>
      }
    />
  );
}
