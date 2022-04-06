import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { useHAStates } from "../hooks";
import { StateListItem, useStateSearch } from "./states";

export function BatteryList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, "", "battery", allStates);

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

  const sortedStates = states?.sort((s1, s2) => {
    const s1v = parseFloat(s1.state);
    const s2v = parseFloat(s2.state);
    if (s1v === s2v) {
      return 0;
    }
    return s1v < s2v ? -1 : 1;
  });
  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {sortedStates?.map((state) => (
        <StateListItem key={state.entity_id} state={state} />
      ))}
    </List>
  );
}
