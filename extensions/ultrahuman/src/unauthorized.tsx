import { List, Icon, Color, ActionPanel, Action, openExtensionPreferences } from "@raycast/api";

export default function Unauthorized(): JSX.Element {
  return (
    <List>
      <List.EmptyView
        icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        title="Unauthorized"
        description="Please check your API key and email in the extension preferences."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
