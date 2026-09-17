import { ShowAttributesAction } from "@components/entity";
import { useHAStates, useVisibleHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { StateListItem } from "@components/state/list";
import { PrimaryIconColor } from "@components/state/utils";
import { partitionFavoriteStates, useEntityOverrides } from "@lib/entity-overrides";
import { ha } from "@lib/common";
import { State } from "@lib/haapi";
import { getStateTooltip } from "@lib/utils";
import { Action, ActionPanel, List, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { HACSRepo } from "./utils";

function HACSUpdateItem(props: { repo: HACSRepo | undefined; state: State }): React.ReactElement | null {
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
            <Action.OpenInBrowser title="Open in Dashboard" url={ha.navigateUrl("hacs/entry")} />
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

function HACSUpdateItems(props: { state: State | undefined }): React.ReactElement | null {
  const s = props.state;
  if (!s) {
    return null;
  }
  const repos: HACSRepo[] | undefined = s.attributes.repositories;
  return (
    <>
      {repos?.map((r, i) => (
        <HACSUpdateItem key={i} repo={r} state={s} />
      ))}
    </>
  );
}

export function UpdatesList(): React.ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useVisibleHAStates();
  const { states: allStatesUnfiltered } = useHAStates();
  const { entityAliases, favoriteEntityIds } = useEntityOverrides();
  const { states } = useStateSearch(searchText, "update", "", allStates, entityAliases);

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

  const { favorites, others } = partitionFavoriteStates(states, favoriteEntityIds);
  const updateRequiredStates = others.filter((s) => s.state === "on");
  const otherStates = others.filter((s) => s.state !== "on");

  const hacsState = allStatesUnfiltered?.find((s) => s.entity_id === "sensor.hacs");

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {favorites.length > 0 && (
        <List.Section title="Favorites" subtitle={`${favorites.length}`}>
          {favorites.map((state) => (
            <StateListItem key={state.entity_id} state={state} />
          ))}
        </List.Section>
      )}
      <List.Section title="Update Available" subtitle={`${updateRequiredStates?.length}`}>
        {updateRequiredStates?.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
        <HACSUpdateItems state={hacsState} />
      </List.Section>
      <List.Section title="Up-to-Date" subtitle={`${otherStates?.length}`}>
        {otherStates?.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
    </List>
  );
}
