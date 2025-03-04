import { State } from "@lib/haapi";
import { Action, ActionPanel, List, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { useHAStates } from "./hooks";

export function StatesAttributesList() {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useSearch(searchText, allStates);

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Cannot search Home Assistant states",
      message: error.message,
    });
  }

  if (!states) {
    return <List isLoading={true} searchBarPlaceholder="Loading" />;
  }

  const stateTitle = (state: State): string => {
    const attrs = state.attributes;
    return attrs.friendly_name ? `${attrs.friendly_name} (${state.entity_id})` : state.entity_id;
  };

  return (
    <List
      searchBarPlaceholder="Filter by entity ID or attribute name"
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
    >
      {states.map((state: State) => (
        <List.Section key={state.entity_id} title={stateTitle(state)}>
          <List.Item
            key={`${state.entity_id}_state`}
            title="state"
            accessories={[
              {
                text: `${state.state}`,
              },
            ]}
          />
          {Object.entries(state.attributes).map(([k, v]) => (
            <List.Item
              key={state.entity_id + k}
              title={k}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Value" content={`${v}`} />
                  <Action.CopyToClipboard title="Copy Name" content={`${k}`} />
                  <Action.CopyToClipboard title="Copy Entity ID" content={`${state.entity_id}`} />
                </ActionPanel>
              }
              accessories={[
                {
                  text: `${v}`,
                },
              ]}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function useSearch(
  query: string | undefined,
  allStates?: State[],
): {
  states?: State[] | undefined;
} {
  const [states, setStates] = useState<State[]>();
  const lquery = query ? query.toLocaleLowerCase().trim() : query;

  useEffect(() => {
    if (allStates) {
      const filteredStates: State[] = [];
      allStates.forEach((s) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attrs: Record<string, any> = {};
        for (const [k, v] of Object.entries(s.attributes)) {
          if (lquery) {
            const friendlyName: string = (s.attributes.friendly_name || "").toLocaleLowerCase();
            const eid = `${s.entity_id}.${k}`.toLocaleLowerCase();
            if (eid.includes(lquery) || friendlyName.includes(lquery)) {
              attrs[k] = v;
            }
          } else {
            attrs[k] = v;
          }
        }
        if (Object.keys(attrs).length > 0) {
          const ns: State = {
            entity_id: s.entity_id,
            state: s.state,
            attributes: attrs,
            last_changed: s.last_changed,
            last_updated: s.last_updated,
          };
          filteredStates.push(ns);
        }
      });
      setStates(filteredStates.slice(0, 100));
    } else {
      setStates(undefined);
    }
  }, [query, allStates]);
  return { states };
}
