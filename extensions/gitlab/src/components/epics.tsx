import { Action, ActionPanel, Color, Icon, Image, List } from "@raycast/api";
import { useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { gitlab } from "../common";
import { Epic, Group, searchData } from "../gitlabapi";
import { GitLabIcons } from "../icons";
import { capitalizeFirstLetter, formatDateTime } from "../utils";
import { GitLabOpenInBrowserAction } from "./actions";
import { CreateEpicTodoAction } from "./epic_actions";

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
  epic: Epic;
  displayGroup?: boolean;
  onChangeDisplayGroup?: (newValue?: boolean) => void;
}) {
  return (
    <List.Item
      id={props.epic.id.toString()}
      title={props.epic.title}
      subtitle={`&${props.epic.iid}`}
      accessories={[
        {
          text:
            props.displayGroup === true && props.epic.references?.full
              ? (() => {
                  const ampersandIndex = props.epic.references!.full!.lastIndexOf("&");
                  return ampersandIndex > 0 ? props.epic.references!.full!.substring(0, ampersandIndex) : undefined;
                })()
              : undefined,
        },
        {
          text: props.epic.upvotes ? `${props.epic.upvotes}` : undefined,
          icon: props.epic.upvotes ? "👍" : undefined,
          tooltip: props.epic.upvotes ? `Upvotes: ${props.epic.upvotes}` : undefined,
        },
        {
          text: props.epic.downvotes ? `${props.epic.downvotes}` : undefined,
          icon: props.epic.downvotes ? "👎" : undefined,
          tooltip: props.epic.downvotes ? `Downvotes: ${props.epic.downvotes}` : undefined,
        },
        ...(props.epic.updated_at
          ? [{ date: new Date(props.epic.updated_at), tooltip: `Updated: ${formatDateTime(props.epic.updated_at)}` }]
          : []),
        {
          icon: props.epic.author ? { source: props.epic.author.avatar_url || "", mask: Image.Mask.Circle } : undefined,
          tooltip: props.epic.author?.name,
        },
      ]}
      icon={{
        value: {
          source: GitLabIcons.epic,
          tintColor: props.epic.state == "opened" ? Color.Green : Color.Purple,
        },
        tooltip: props.epic.state ? `Status: ${capitalizeFirstLetter(props.epic.state)}` : "",
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <GitLabOpenInBrowserAction url={props.epic.web_url} />
            <CreateEpicTodoAction epic={props.epic} shortcut={{ modifiers: ["cmd"], key: "t" }} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy Epic ID" content={props.epic.id} />
            <ActionToggleGroupName show={props.displayGroup} callback={props.onChangeDisplayGroup} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export function EpicList(props: { group: Group }) {
  const [searchText, setSearchText] = useState<string>();
  const { data, isLoading } = useCachedPromise(
    async (groupID: number): Promise<Epic[]> => {
      return (await gitlab.fetch(`groups/${groupID}/epics`, { min_access_level: "30", state: "opened" }, true)) || [];
    },
    [props.group.id],
    { initialData: [] },
  );

  const epics: Epic[] = searchData<Epic>(data, { search: searchText || "", keys: ["title"], limit: 50 });
  return (
    <List
      searchBarPlaceholder="Filter Epics by name..."
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      throttle={true}
      navigationTitle={`Epics ${props.group.full_path}`}
    >
      <List.Section title={`Recent Epics ${epics.length}`} subtitle={`${epics.length}`}>
        {epics.map((epic) => (
          <EpicListItem key={epic.id} epic={epic} />
        ))}
      </List.Section>
    </List>
  );
}
