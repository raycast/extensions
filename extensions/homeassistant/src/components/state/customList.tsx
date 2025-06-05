import { useHAStates } from "@components/hooks";
import { State } from "@lib/haapi";
import { List, Toast, showToast } from "@raycast/api";
import { useState } from "react";
import { useStateSearch } from "./hooks";
import { StateListItem } from "@components/state/list";

export function CustomStatesList(props: { entitiesState?: State[] | undefined }): React.ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, "", undefined, props.entitiesState ?? allStates);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot search Home Assistant states.",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const filterAndSortStates = (states: State[], filterCondition: (s: State) => boolean) => {
    return states
      ?.filter(filterCondition)
      ?.sort((a: State, b: State) =>
        (a.attributes.friendly_name || a.entity_id).localeCompare(b.attributes.friendly_name || b.entity_id),
      );
  };

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {[
        { title: "On", filter: (s: State) => s.state === "on" },
        { title: "Off", filter: (s: State) => s.state === "off" },
        { title: "Other", filter: (s: State) => s.state !== "on" && s.state !== "off" },
      ].map(({ title, filter }) => (
        <List.Section key={title} title={title}>
          {filterAndSortStates(states, filter).map((state) => (
            <StateListItem key={state.entity_id} state={state} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
