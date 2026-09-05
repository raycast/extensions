import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

/**
 * The one failure worth its own screen: a missing or rejected token leaves every
 * command dead until the preferences are fixed. Say so, and put the fix one
 * keystroke away instead of making the user hunt for it.
 */
export function ConnectionError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="Cannot Reach Hule"
        description={message}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          </ActionPanel>
        }
      />
    </List>
  );
}
