import { useVisibleHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { StateListItem } from "@components/state/list";
import { partitionFavoriteStates, useEntityOverrides } from "@lib/entity-overrides";
import { List, showToast, Toast } from "@raycast/api";
import React, { useState } from "react";
import { sortBatteries } from "./utils";

export function BatteryList(): React.ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useVisibleHAStates();
  const { entityAliases, favoriteEntityIds } = useEntityOverrides();
  const { states } = useStateSearch(searchText, "", "battery", allStates, entityAliases);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot search Home Assistant Batteries",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const batteryStates = sortBatteries(states) ?? states;
  const { favorites, others } = partitionFavoriteStates(batteryStates, favoriteEntityIds);

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {favorites.length > 0 && (
        <List.Section title="Favorites" subtitle={`${favorites.length}`}>
          {favorites.map((state) => (
            <StateListItem key={state.entity_id} state={state} />
          ))}
        </List.Section>
      )}
      <List.Section title={favorites.length > 0 ? "Batteries" : undefined} subtitle={`${others.length}`}>
        {others.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
    </List>
  );
}
