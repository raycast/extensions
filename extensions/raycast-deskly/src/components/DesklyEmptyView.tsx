import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";

type DesklyEmptyViewProps = {
  title: string;
  description: string;
  icon: Icon;
  isLoading?: boolean;
};

export default function DesklyEmptyView({ title, description, icon, isLoading = false }: DesklyEmptyViewProps) {
  const preferences = getPreferenceValues<Preferences>();

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        title={title}
        description={description}
        icon={icon}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser url={preferences.apiUrl} />
          </ActionPanel>
        }
      />
    </List>
  );
}
