import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { ClickUpList } from "../../types/clickup";
import { ItemAccessory } from "../../types/raycast";
import { CopyId, CopyUrl } from "../actions/CopyActions";
import { OpenInClickUp } from "../actions/OpenInClickUp";
import { ListDetail } from "./ListDetail";
import { ListTasks } from "./ListTasks";

interface Props {
  list: ClickUpList;
}

export function ListListItem({ list }: Props) {
  const accessories: ItemAccessory[] = [];

  if (list.task_count !== undefined) {
    accessories.push({
      text: `${list.task_count} ${list.task_count === 1 ? "task" : "tasks"}`,
    });
  }
  const subtitle = list.folder ? list.folder.name : undefined;
  const listUrl =
    list.url ||
    (list.team_id ? `https://app.clickup.com/${list.team_id}/v/li/${list.id}` : `https://app.clickup.com/l/${list.id}`);

  return (
    <List.Item
      accessories={accessories}
      actions={
        <ActionPanel>
          <Action.Push icon={Icon.List} target={<ListTasks list={list} />} title="View Tasks" />
          <Action.Push icon={Icon.Info} target={<ListDetail list={list} />} title="View List Details" />
          <OpenInClickUp url={listUrl} />
          <CopyUrl url={listUrl} />
          <CopyId id={list.id} />
        </ActionPanel>
      }
      key={list.id}
      subtitle={subtitle}
      title={list.name}
    />
  );
}
