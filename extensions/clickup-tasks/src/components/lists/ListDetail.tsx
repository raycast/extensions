import { ActionPanel, Detail } from "@raycast/api";
import { ClickUpList } from "../../types/clickup";
import { CopyId, CopyUrl } from "../actions/CopyActions";
import { OpenInClickUp } from "../actions/OpenInClickUp";

interface Props {
  list: ClickUpList;
}

export function ListDetail({ list }: Props) {
  let markdown = `# ${list.name}`;

  if (list.content) {
    markdown += `\n\n${list.content}`;
  }

  const listUrl =
    list.url ||
    (list.team_id ? `https://app.clickup.com/${list.team_id}/v/li/${list.id}` : `https://app.clickup.com/l/${list.id}`);

  return (
    <Detail
      actions={
        <ActionPanel>
          <OpenInClickUp isDefault url={listUrl} />
          <CopyUrl url={listUrl} />
          <CopyId id={list.id} />
        </ActionPanel>
      }
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label text={list.name} title="List Name" />

          {list.space && <Detail.Metadata.Label text={list.space.name} title="Space" />}

          {list.folder && <Detail.Metadata.Label text={list.folder.name} title="Folder" />}

          {list.task_count !== undefined && <Detail.Metadata.Label text={String(list.task_count)} title="Task Count" />}

          <Detail.Metadata.Separator />

          {list.statuses && list.statuses.length > 0 && (
            <>
              <Detail.Metadata.TagList title="Statuses">
                {list.statuses.map((status) => (
                  <Detail.Metadata.TagList.Item color={status.color} key={status.id} text={status.status} />
                ))}
              </Detail.Metadata.TagList>
              <Detail.Metadata.Separator />
            </>
          )}

          <Detail.Metadata.Link target={listUrl} text="View List" title="Open in ClickUp" />
        </Detail.Metadata>
      }
    />
  );
}
