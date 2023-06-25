import { ActionPanel, Action, Detail, openExtensionPreferences, List, Icon } from "@raycast/api";
import PlayerComponent from "./PlayerInfo";

interface IErrorProps {
  searchText: string;
}

export default function Error404({ searchText }: IErrorProps) {
  return (
    <List.EmptyView
      description="Try With Another Player Id."
      icon={Icon.Person}
      title="No Player Found"
      actions={
        <ActionPanel>
          <Action.Push title="Search Player" icon={Icon.Sidebar} target={<PlayerComponent id={searchText} />} />
        </ActionPanel>
      }
    />
  );
}
