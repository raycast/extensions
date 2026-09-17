import { useHAStates, useVisibleHAStates } from "@components/hooks";
import { useStateSearch } from "@components/state/hooks";
import { StateListItem } from "@components/state/list";
import { partitionFavoriteStates, useEntityOverrides } from "@lib/entity-overrides";
import { State } from "@lib/haapi";
import { getDisplayName } from "@lib/utils";
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
  const { states: allStates, error, isLoading } = useVisibleHAStates();
  const { entityAliases, favoriteEntityIds } = useEntityOverrides();
  const { states } = useStateSearch(searchText, "zone", "", allStates, entityAliases);

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

  const sortByDisplayName = (items: State[]) =>
    [...items].sort((a, b) =>
      getDisplayName(a, entityAliases[a.entity_id]).localeCompare(getDisplayName(b, entityAliases[b.entity_id])),
    );
  const { favorites, others } = partitionFavoriteStates(states, favoriteEntityIds);
  const favoriteStates = sortByDisplayName(favorites);
  const otherStates = sortByDisplayName(others);

  return (
    <List searchBarPlaceholder="Filter by name or ID..." isLoading={isLoading} onSearchTextChange={setSearchText}>
      {favoriteStates.length > 0 && (
        <List.Section title="Favorites" subtitle={`${favoriteStates.length}`}>
          {favoriteStates.map((state) => (
            <StateListItem key={state.entity_id} state={state} />
          ))}
        </List.Section>
      )}
      <List.Section title={favoriteStates.length > 0 ? "Zones" : undefined} subtitle={`${otherStates.length}`}>
        {otherStates.map((state) => (
          <StateListItem key={state.entity_id} state={state} />
        ))}
      </List.Section>
    </List>
  );
}
