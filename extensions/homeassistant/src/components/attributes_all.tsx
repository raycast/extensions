import { ActionPanel, CopyToClipboardAction, List, ListItem, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { createHomeAssistantClient } from "../common";
import { State } from "../haapi";
import { useHAStates } from "../hooks";

export const ha = createHomeAssistantClient();

export function StatesAttributesList(props: { domain: string }) {
  const [searchText, setSearchText] = useState<string>();
  const { states: allStates, error, isLoading } = useHAStates();
  const { states } = useSearch(searchText, allStates);

  if (error) {
    showToast(ToastStyle.Failure, "Cannot search Home Assistant states", error.message);
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
          <List.Item key={`${state.entity_id}_state`} title="state" accessoryTitle={`${state.state}`} />
          {Object.entries(state.attributes).map(([k, v]) => (
            <List.Item
              key={state.entity_id + k}
              title={k}
              accessoryTitle={`${v}`}
              actions={
                <ActionPanel>
                  <CopyToClipboardAction title="Copy Value" content={`${v}`} />
                  <CopyToClipboardAction title="Copy Name" content={`${k}`} />
                  <CopyToClipboardAction title="Copy Entity ID" content={`${state.entity_id}`} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

function useSearch(
  query: string | undefined,
  allStates?: State[]
): {
  states?: State[];
} {
  const [states, setStates] = useState<State[]>();
  const lquery = query ? query.toLocaleLowerCase().trim() : query;

  useEffect(() => {
    if (allStates) {
      let filteredStates: State[] = [];
      allStates.forEach((s) => {
        let attrs: Record<string, any> = {};
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
          const ns: State = { entity_id: s.entity_id, state: s.state, attributes: attrs };
          filteredStates.push(ns);
        }
      });
      setStates(filteredStates.slice(0, 100));
    } else {
      setStates([]);
    }
  }, [query, allStates]);
  return { states };
}
