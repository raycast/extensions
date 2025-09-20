import { useHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { StateListItem } from "@components/state/list";
import { State } from "@lib/haapi";
import { List, Toast, showToast } from "@raycast/api";
import React, { useEffect, useState } from "react";

export function ZoneList(props: { state: State }): React.ReactElement {
  const s = props.state;
  const { states: allStates, isLoading } = useHAStates();
  const persons = s.attributes.persons as string[] | undefined;
  const [resolvedPersons, setResolvedPersons] = useState<State[]>();

  useEffect(() => {
    if (s && allStates && allStates.length > 0 && persons && persons.length > 0) {
      const resolved: State[] = [];
      for (const eid of persons) {
        const personEntity = allStates.find((e) => e.entity_id === eid);
        if (personEntity) {
          resolved.push(personEntity);
        }
      }
      setResolvedPersons(resolved);
    }
  }, [s, allStates]);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Persons in Zone" subtitle={`${persons?.length}`}>
        {resolvedPersons?.map((ps) => (
          <StateListItem key={ps.entity_id} state={ps} />
        ))}
      </List.Section>
    </List>
  );
}

export function ZonesList(): React.ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useStateSearch(searchText, "zone", "", allStates);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot fetch Home Assistant Zones",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {states?.map((state) => (
        <StateListItem key={state.entity_id} state={state} />
      ))}
    </List>
  );
}
