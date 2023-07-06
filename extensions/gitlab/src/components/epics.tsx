import { Action, ActionPanel, Color, Image, List } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Epic, Group, searchData } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { capitalizeFirstLetter, showErrorToast } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";
import { CacheActionPanelSection } from "./cache_actions";
import { CreateEpicTodoAction } from "./epic_actions";

/* eslint-disable @typescript-eslint/no-explicit-any,@typescript-eslint/explicit-module-boundary-types */

function getIcon(state: string): Image {
  if (state == "opened") {
    return { source: GitLabIcons.epic, tintColor: Color.Green };
  } else {
    return { source: GitLabIcons.epic, tintColor: Color.Purple };
  }
}

function getEpicGroupName(epic: any): string | undefined {
  const f: string | undefined = epic?.references?.full;
  if (!f) {
    return;
  }
  const i = f.lastIndexOf("&");
  if (i > 0) {
    return f.substring(0, i);
  }
}

export function EpicListItem(props: { epic: any }) {
  const epic = props.epic;
  const icon = getIcon(epic.state as string);
  const groupName = getEpicGroupName(epic);
  return (
    <List.Item
      id={epic.id.toString()}
      title={epic.title}
      subtitle={`&${epic.iid}`}
      accessories={[
        { text: groupName },
        { icon: { source: epic.author.avatar_url || "", mask: Image.Mask.Circle }, tooltip: epic.author?.name },
      ]}
      icon={{ value: icon, tooltip: epic.state ? `Status: ${capitalizeFirstLetter(epic.state)}` : "" }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <GitLabOpenInBrowserAction url={epic.web_url} />
            <CreateEpicTodoAction epic={epic} shortcut={{ modifiers: ["cmd"], key: "t" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Epic ID" content={epic.id} />
          </ActionPanel.Section>
          <CacheActionPanelSection />
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
  console.log("LLLL");
  return (
    <List
      searchBarPlaceholder="Filter Epics by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      navigationTitle={navTitle}
    >
      <List.Section
        title={data ? `Recent Epics ${data.length}` : undefined}
        subtitle={data ? `${data.length}` : undefined}
      >
        {data?.map((epic) => (
          <EpicListItem key={epic.id} epic={epic} />
        ))}
      </List.Section>
    </List>
  );
}
