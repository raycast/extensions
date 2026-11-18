import { List, Icon, ActionPanel, Action } from "@raycast/api";
import { useLists } from "./hooks/useLists";
import { ClickUpList } from "./types/clickup";
import { OpenInClickUpAction } from "./components/OpenInClickUpAction";
import { ListTasksView } from "./views/ListTasksView";

export default function BrowseLists() {
  const { error, isLoading, listsBySpace } = useLists();

  if (error && !isLoading && listsBySpace.length === 0) {
    return (
      <List>
        <List.EmptyView description={error.message} icon={Icon.ExclamationMark} title="Failed to load lists" />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} navigationTitle="Browse Lists" searchBarPlaceholder="Search lists...">
      {listsBySpace.length === 0 && !isLoading && (
        <List.EmptyView description="No lists found in your workspace" icon={Icon.List} title="No lists" />
      )}
      {listsBySpace.map(({ lists, space }) => (
        <List.Section key={space.id} title={space.name} subtitle={`${lists.length} lists`}>
          {lists.map((list) => (
            <ListItem key={list.id} list={list} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

interface ListItemProps {
  list: ClickUpList;
}

function ListItem({ list }: ListItemProps) {
  const taskCount =
    typeof list.task_count === "number" ? list.task_count : parseInt(String(list.task_count || "0"), 10);
  const subtitle = list.folder ? `${list.folder.name}` : undefined;

  return (
    <List.Item
      accessories={[{ text: `${taskCount} tasks` }]}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.List} target={<ListTasksView list={list} />} title="View Tasks" />
          {list.url && <OpenInClickUpAction route={list.url} override />}
          <Action.CopyToClipboard content={list.id} icon={Icon.Key} title="Copy List ID" />
        </ActionPanel>
      }
      icon={Icon.List}
      subtitle={subtitle}
      title={list.name}
    />
  );
}
