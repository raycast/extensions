import { Action, ActionPanel, Color, Image, List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Epic, Group, searchData } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { ensureCleanAccessories, showErrorToast } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";
import { ClearLocalCacheAction } from "./cache_actions";
import { CreateEpicTodoAction } from "./epic_actions";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

function getIcon(state: string): Image {
  if (state == "opened") {
    return { source: GitLabIcons.mropen, tintColor: Color.Green };
  } else {
    return { source: GitLabIcons.merged, tintColor: Color.Purple };
  }
}

export function EpicListItem(props: { epic: any }) {
  const epic = props.epic;
  const icon = getIcon(epic.state as string);
  return (
    <List.Item
      id={epic.id.toString()}
      title={epic.title}
      accessories={ensureCleanAccessories([
        { icon: { source: epic.author.avatar_url || "", mask: Image.Mask.Circle } },
      ])}
      icon={icon}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <GitLabOpenInBrowserAction url={epic.web_url} />
            <CreateEpicTodoAction epic={epic} shortcut={{ modifiers: ["cmd"], key: "t" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Epic ID" content={epic.id} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ClearLocalCacheAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function EpicList(props: { group: Group }) {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useCache<Epic[]>(
    `group_${props.group.id}_epics`,
    async () => {
      const data =
        (await gitlab.fetch(
          `groups/${props.group.id}/epics`,
          {
            min_access_level: "30",
            state: "opened",
          },
          true
        )) || [];
      return data;
    },
    {
      deps: [searchText],
      onFilter: async (epics) => {
        return searchData<Epic>(epics, { search: searchText || "", keys: ["title"], limit: 50 });
      },
    }
  );

  if (error) {
    showErrorToast(error, "Cannot search Epics");
  }

  const navTitle = `Epics ${props.group.full_path}`;

  return (
    <List
      searchBarPlaceholder="Filter Epics by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      navigationTitle={navTitle}
    >
      {data?.map((epic) => (
        <EpicListItem key={epic.id} epic={epic} />
      ))}
    </List>
  );
}
