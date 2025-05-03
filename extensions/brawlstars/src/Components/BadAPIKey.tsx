import { ActionPanel, Action, openExtensionPreferences, List, Icon } from "@raycast/api";

interface IErrorProps {
  error: string;
}

export default function Error403({ error }: IErrorProps) {
  return (
    <List navigationTitle={error}>
      <List.EmptyView
        icon={Icon.ExclamationMark}
        title="API key incorrect"
        description="Please update it in extension preferences and try again."
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    </List>
  );
}
