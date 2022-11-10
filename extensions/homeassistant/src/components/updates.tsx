import { Color, Detail, Icon, Action, ActionPanel, showHUD, confirmAlert, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { ha } from "../common";
import { State } from "../haapi";
import { useHAStates } from "../hooks";
import { StateListItem, useStateSearch } from "./states";

function ChangelogDetail(props: { state: State }): JSX.Element {
  const s = props.state;
  const md = s.attributes.release_summary || "";
  return (
    <Detail
      markdown={md}
      actions={
        <ActionPanel>
          <UpdateOpenInBrowser state={s} />
        </ActionPanel>
      }
    />
  );
}

export function UpdateShowChangelog(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("update") || !s.attributes.release_summary) {
    return null;
  }
  return (
    <Action.Push
      title="Show Changelog"
      shortcut={{ modifiers: ["cmd"], key: "l" }}
      icon={{ source: Icon.BlankDocument, tintColor: Color.PrimaryText }}
      target={<ChangelogDetail state={s} />}
    />
  );
}

export function UpdateOpenInBrowser(props: { state: State }): JSX.Element | null {
  const s = props.state;
  const url = s.attributes.release_url;
  if (!s.entity_id.startsWith("update") || !url) {
    return null;
  }
  return (
    <Action.OpenInBrowser
      shortcut={{ modifiers: ["cmd"], key: "b" }}
      url={url}
      onOpen={() => showHUD("Open Release Notes in Browser")}
    />
  );
}

export function UpdateInstallAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("update")) {
    return null;
  }
  if (s.state !== "on") {
    return null;
  }
  if (s.attributes.in_progress !== false) {
    return null;
  }
  const handle = async () => {
    if (
      await confirmAlert({
        title: `Installing Update ${s.attributes.title || ""}?
        `,
        message: "Backup will be generated before if the integration supports it",
      })
    )
      await ha.callService("update", "install", { entity_id: s.entity_id, backup: true });
  };
  return (
    <Action
      title="Update with Backup"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "i" }}
      icon={{ source: Icon.Download, tintColor: Color.PrimaryText }}
    />
  );
}

export function UpdateSkipVersionAction(props: { state: State }): JSX.Element | null {
  const s = props.state;
  if (!s.entity_id.startsWith("update")) {
    return null;
  }
  if (s.state !== "on") {
    return null;
  }
  const handle = async () => {
    if (
      await confirmAlert({
        title: `Skip version ${s.attributes.title || ""}?`,
      })
    )
      await ha.callService("update", "skip", { entity_id: s.entity_id });
  };
  return (
    <Action
      title="Skip Update"
      onAction={handle}
      shortcut={{ modifiers: ["cmd"], key: "s" }}
      icon={{ source: Icon.ArrowRight, tintColor: Color.PrimaryText }}
    />
  );
}

export function UpdatesList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, "update", "", allStates);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot fetch Home Assistant Updates",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const updateRequiredStates = states.filter((s) => s.state === "on");
  const otherStates = states.filter((s) => s.state !== "on");

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      <List.Section title="Updates available" subtitle={`${updateRequiredStates?.length}`}>
        {updateRequiredStates?.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
      <List.Section title="No Updates required" subtitle={`${otherStates?.length}`}>
        {otherStates?.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
    </List>
  );
}
