import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { errorMessage } from "../lib/reelspan";

/** What a list shows when loading failed, so a bad API key or a network error never looks like an empty account. */
export function LoadError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title={title}
      description={errorMessage(error)}
      actions={
        <ActionPanel>
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}
