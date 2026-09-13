import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import CheckConnection from "../check-connection";

export function ErrorView({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <List>
      <List.EmptyView
        icon={Icon.Warning}
        title="Cannot Reach Dolibarr"
        description={error.message}
        actions={
          <ActionPanel>
            <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={onRetry} />
            <Action.Push title="Check Connection" icon={Icon.Plug} target={<CheckConnection />} />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
