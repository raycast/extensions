import { ActionPanel, List, Action } from "@raycast/api";
import { Changelog } from "../utils/hellonext";
import ChangelogSingleItem from "./ChangelogSingleItem";

interface ChangelogListItemProps {
  changelog: Changelog;
}

export default function ChangelogListItem({ changelog }: ChangelogListItemProps) {
  return (
    <List.Item
      key={changelog.id}
      title={changelog.title}
      actions={
        <ActionPanel>
          <Action.Push title="View Changelog" target={<ChangelogSingleItem changelog={changelog} />} />
        </ActionPanel>
      }
    />
  );
}
