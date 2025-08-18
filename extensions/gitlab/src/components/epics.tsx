import { Action, ActionPanel, Color, Icon, Image, List, getPreferenceValues } from "@raycast/api";
import { useState } from "react";
import { useCache } from "../cache";
import { gitlab } from "../common";
import { Epic, Group, searchData } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { capitalizeFirstLetter, showErrorToast, toLongDateString } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";
import { CacheActionPanelSection } from "./cache_actions";
import { CreateEpicTodoAction } from "./epic_actions";

/* eslint-disable @typescript-eslint/no-explicit-any */

function getIcon(state: string): Image {
  if (state == "opened") {
    return { source: GitLabIcons.epic, tintColor: Color.Green };
  } else {
    return { source: GitLabIcons.epic, tintColor: Color.Purple };
  }
}

export function includeGroupAncestorPreference(): boolean {
  const prefs = getPreferenceValues();
  return (prefs.includeEpicAncestor as boolean) || false;
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

function ActionToggleGroupName(props: { show?: boolean; callback?: (newValue: boolean) => void }) {
  if (!props.callback) {
    return null;
  }
  return (
    <Action
      title={"Toggle Group Name"}
      icon={props.show === true ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{ modifiers: ["opt"], key: "d" }}
      onAction={() => {
        if (props.callback) {
          props.callback(!props.show);
        }
      }}
    />
  );
}

export function EpicListItem(props: {
  epic: any;
  displayGroup?: boolean;
  onChangeDisplayGroup?: (newValue?: boolean) => void;
}) {
  const epic = props.epic;
  const icon = getIcon(epic.state as string);
  const groupName = getEpicGroupName(epic);
  return (
    <List.Item
      id={epic.id.toString()}
      title={epic.title}
      subtitle={`&${epic.iid}`}
      accessories={[
        { text: props.displayGroup === true ? groupName : undefined },
        {
          text: epic.upvotes ? `${epic.upvotes}` : undefined,
          icon: epic.upvotes ? "👍" : undefined,
          tooltip: epic.upvotes ? `Upvotes: ${epic.upvotes}` : undefined,
        },
        {
          text: epic.downvotes ? `${epic.downvotes}` : undefined,
          icon: epic.downvotes ? "👎" : undefined,
          tooltip: epic.downvotes ? `Downvotes: ${epic.downvotes}` : undefined,
        },
        { date: new Date(epic.updated_at), tooltip: `Updated: ${toLongDateString(epic.updated_at)}` },
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
            <ActionToggleGroupName show={props.displayGroup} callback={props.onChangeDisplayGroup} />
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
          true,
        )) || [];
      return data;
    },
    {
      deps: [searchText],
      onFilter: async (epics) => {
        return searchData<Epic>(epics, { search: searchText || "", keys: ["title"], limit: 50 });
      },
    },
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
