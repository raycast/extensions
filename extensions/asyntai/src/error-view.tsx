import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";

// Shown in place of a list when Asyntai refuses the call. The first action
// opens the extension preferences, where the API key lives.
export default function ErrorView(props: { message: string; retry: () => void }) {
  return (
    <List.EmptyView
      icon={Icon.Warning}
      title="Asyntai did not answer"
      description={props.message}
      actions={
        <ActionPanel>
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.retry} />
        </ActionPanel>
      }
    />
  );
}
