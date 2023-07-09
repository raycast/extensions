import { ActionPanel, Action, Detail, openExtensionPreferences, List, Icon } from "@raycast/api";
import PlayerComponent from "./PlayerInfo";
import ClubComponent from "./clubInfo";

interface IErrorProps {
  searchText: string;
}

export default function ClubNotFoundError({ searchText }: IErrorProps) {
  return (
    <List.EmptyView
      description="Try With Another Club Id."
      icon={Icon.TwoPeople}
      title="No Club Found"
      actions={
        <ActionPanel>
          <Action.Push title="Search Club" icon={Icon.MagnifyingGlass} target={<ClubComponent id={searchText} />} />
        </ActionPanel>
      }
    />
  );
}
