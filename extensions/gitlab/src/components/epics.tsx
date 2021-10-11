import {
  ActionPanel,
  Color,
  CopyToClipboardAction,
  Image,
  ImageMask,
  List,
  OpenInBrowserAction,
  showToast,
  ToastStyle,
} from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Epic, Group, searchData } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { ClearLocalCacheAction } from "./cache_actions";

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
      accessoryIcon={{ source: epic.author.avatar_url || "", mask: ImageMask.Circle }}
      icon={icon}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={epic.web_url} />
          <CopyToClipboardAction title="Copy Epic ID" content={epic.id} />
          <ClearLocalCacheAction />
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
        return await searchData<Epic>(epics, { search: searchText || "", keys: ["title"], limit: 50 });
      },
    }
  );

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search epics", error);
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
