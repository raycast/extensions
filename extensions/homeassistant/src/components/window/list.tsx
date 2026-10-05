import { useVisibleHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { StateListItem } from "@components/state/list";
import { partitionFavoriteStates, useEntityOverrides } from "@lib/entity-overrides";
import { List, Toast, showToast } from "@raycast/api";
import React, { useState } from "react";

export function WindowsList(): React.ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useVisibleHAStates();
  const { entityAliases, favoriteEntityIds } = useEntityOverrides();
  const { states } = useStateSearch(searchText, "binary_sensor", "window", allStates, entityAliases);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot fetch Home Assistant Windows",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const { favorites, others } = partitionFavoriteStates(states, favoriteEntityIds);
  const updateRequiredStates = others.filter((s) => s.state === "on");
  const otherStates = others.filter((s) => s.state !== "on");

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {favorites.length > 0 && (
        <List.Section title="Favorites" subtitle={`${favorites.length}`}>
          {favorites.map((state) => (
            <StateListItem key={state.entity_id} state={state} />
          ))}
        </List.Section>
      )}
      <List.Section title="Open Windows" subtitle={`${updateRequiredStates?.length}`}>
        {updateRequiredStates?.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
      <List.Section title="Closed Windows" subtitle={`${otherStates?.length}`}>
        {otherStates?.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
    </List>
  );
}
