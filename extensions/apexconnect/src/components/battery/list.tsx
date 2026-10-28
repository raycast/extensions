import { useFailureToast, useHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { StateListItem } from "@components/state/list";
import { List } from "@raycast/api";
import { useState } from "react";
import { sortBatteries } from "./utils";

export function BatteryList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, "", "battery", allStates);

  useFailureToast(error, { title: "Cannot search Apex Connect Batteries" });

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const sortedStates = sortBatteries(states);
  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {sortedStates?.map((state) => <StateListItem key={state.entity_id} state={state} />)}
    </List>
  );
}
