import { Action, ActionPanel, Color, Icon, List, open, Keyboard } from "@raycast/api";

import type { ProjectUpdateItem } from "../api/projects";
import { cleanLinearMarkdown, formatDate, formatRelative, PROJECT_HEALTH_LABEL } from "../helpers/format-update";
import { getUserAvatar, projectHealthColor } from "../helpers/icons";
import { getLinearAppUrl } from "../helpers/open-linear";

function UpdateDetailMetadata({ update }: { update: ProjectUpdateItem }) {
  return (
    <List.Item.Detail.Metadata>
      <List.Item.Detail.Metadata.TagList title="Health">
        <List.Item.Detail.Metadata.TagList.Item
          text={update.health ? PROJECT_HEALTH_LABEL[update.health] : "Update"}
          color={update.health ? projectHealthColor[update.health] : Color.SecondaryText}
        />
      </List.Item.Detail.Metadata.TagList>
      <List.Item.Detail.Metadata.Label
        title="Author"
        text={update.user.displayName}
        icon={getUserAvatar(update.user)}
      />
      <List.Item.Detail.Metadata.Label title="Posted" text={formatDate(update.createdAt) ?? ""} />
    </List.Item.Detail.Metadata>
  );
}

function UpdateItem({ update }: { update: ProjectUpdateItem }) {
  const relative = formatRelative(update.createdAt) ?? formatDate(update.createdAt) ?? "";

  return (
    <List.Item
      title={update.health ? PROJECT_HEALTH_LABEL[update.health] : "Update"}
      subtitle={update.user.displayName}
      icon={{
        source: Icon.Heartbeat,
        tintColor: update.health ? projectHealthColor[update.health] : Color.SecondaryText,
      }}
      accessories={[{ text: relative }]}
      detail={
        <List.Item.Detail
          markdown={update.body ? cleanLinearMarkdown(update.body) : "_Empty update._"}
          metadata={<UpdateDetailMetadata update={update} />}
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Update in Linear" url={update.url} icon={Icon.Globe} />
          <Action
            title="Open Update in Linear App"
            icon={Icon.AppWindow}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
            onAction={() => open(getLinearAppUrl(update.url))}
          />
          <Action.CopyToClipboard title="Copy Update" content={update.body} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    />
  );
}

export function ProjectUpdatesList({ updates, projectName }: { updates: ProjectUpdateItem[]; projectName: string }) {
  return (
    <List
      isShowingDetail
      navigationTitle={`${projectName} · Pulse Updates`}
      searchBarPlaceholder="Filter pulse updates"
    >
      {updates.map((update) => (
        <UpdateItem key={update.id} update={update} />
      ))}
      <List.EmptyView title="No pulse updates" description="This project doesn't have any pulse updates yet." />
    </List>
  );
}
