import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { useHAStates } from "@components/hooks";
import { getStateTooltip } from "@lib/utils";
import { ShowAttributesAction } from "@components/entity";
import { StateListItem } from "@components/state/list";
import { HACSRepo } from "./utils";
import { useStateSearch } from "@components/state/hooks";
import { PrimaryIconColor } from "@components/state/utils";

function HACSUpdateItem(props: { repo: HACSRepo | undefined; state: State }): JSX.Element | null {
  const r = props.repo;
  if (!r || !r.display_name || !r.available_version || !r.name) {
    return null;
  }
  return (
    <List.Item
      title={r.display_name || r.name}
      icon={{ source: "hacs.svg", tintColor: PrimaryIconColor }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Install">
            <Action.OpenInBrowser title="Open in Dashboard" url={ha.urlJoin("hacs/entry")} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Attribtues">
            <ShowAttributesAction state={props.state} />
          </ActionPanel.Section>
        </ActionPanel>
      }
      accessories={[
        { text: `${r.installed_version} => ${r.available_version}`, tooltip: getStateTooltip(props.state) },
      ]}
    />
  );
}

function HACSUpdateItems(props: { state: State | undefined }): JSX.Element | null {
  const s = props.state;
  if (!s) {
    return null;
  }
  const repos: HACSRepo[] | undefined = s.attributes.repositories;
  return <>{repos?.map((r, i) => <HACSUpdateItem key={i} repo={r} state={s} />)}</>;
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

  const hacsState = allStates?.find((s) => s.entity_id === "sensor.hacs");

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      <List.Section title="Updates available" subtitle={`${updateRequiredStates?.length}`}>
        {updateRequiredStates?.map((state) => <StateListItem key={state.entity_id} state={state} />)}
        <HACSUpdateItems state={hacsState} />
      </List.Section>
      <List.Section title="No Updates required" subtitle={`${otherStates?.length}`}>
        {otherStates?.map((state) => <StateListItem key={state.entity_id} state={state} />)}
      </List.Section>
    </List>
  );
}
