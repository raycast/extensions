import { useVisibleHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { StateListItem } from "@components/state/list";
import { sortStatesWithFavoritesFirst, useEntityOverrides } from "@lib/entity-overrides";
import { List, Toast, showToast } from "@raycast/api";
import React, { useState } from "react";

export function DoorsList(): React.ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useVisibleHAStates();
  const { entityAliases, favoriteEntityIds } = useEntityOverrides();
  const { states } = useStateSearch(searchText, "", "door", allStates, entityAliases);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot fetch Home Assistant Doors",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const sortedStates = sortStatesWithFavoritesFirst(states, favoriteEntityIds, entityAliases);
  const updateRequiredStates = sortedStates.filter((s) => s.state === "on");
  const otherStates = sortedStates.filter((s) => s.state !== "on");

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      <List.Section title="Open Doors" subtitle={`${updateRequiredStates?.length}`}>
        {updateRequiredStates?.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
      <List.Section title="Closed Doors" subtitle={`${otherStates?.length}`}>
        {otherStates?.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
    </List>
  );
}
