import { useFailureToast, useHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { StateListItem } from "@components/state/list";
import { List } from "@raycast/api";
import { useState } from "react";

export function WindowsList(): JSX.Element {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, "binary_sensor", "window", allStates);

  useFailureToast(error, { title: "Cannot fetch Apex Connect Windows" });

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const updateRequiredStates = states.filter((s) => s.state === "on");
  const otherStates = states.filter((s) => s.state !== "on");

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      <List.Section title="Open Windows" subtitle={`${updateRequiredStates?.length}`}>
        {updateRequiredStates?.map((state) => <StateListItem key={state.entity_id} state={state} />)}
      </List.Section>
      <List.Section title="Closed Windows" subtitle={`${otherStates?.length}`}>
        {otherStates?.map((state) => <StateListItem key={state.entity_id} state={state} />)}
      </List.Section>
    </List>
  );
}
