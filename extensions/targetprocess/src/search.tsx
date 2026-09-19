import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";

import { EntityTypeInfo } from "./api/entityTypes";
import { search, SearchResult } from "./api/entities";
import { describeFailure } from "./api/failures";
import { asEntityId } from "./api/queries";
import { EntityListItem } from "./components/EntityListItem";
import { InstanceDropdown } from "./components/InstanceDropdown";
import { NoInstances } from "./components/NoInstances";
import { TypeFilterList } from "./components/TypeFilterList";
import { summariseSelection } from "./filters/catalogue";
import { useDebouncedValue } from "./hooks/useDebouncedValue";
import { useEntityTypes } from "./hooks/useEntityTypes";
import { useInstances } from "./hooks/useInstances";
import { useTypeFilter } from "./hooks/useTypeFilter";
import { PlatformShortcut } from "./shortcuts";

const EMPTY: SearchResult = { exact: null, matches: [] };

const TOGGLE_CLOSED: PlatformShortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "x" },
  Windows: { modifiers: ["ctrl", "shift"], key: "x" },
};

const OPEN_FILTERS: PlatformShortcut = {
  macOS: { modifiers: ["cmd", "shift"], key: "f" },
  Windows: { modifiers: ["ctrl", "shift"], key: "f" },
};

export default function SearchCommand() {
  const { instances, active, isLoading: loadingInstances, selectInstance } = useInstances();
  const { catalogue, isLoading: loadingTypes } = useEntityTypes(active);
  const { selected: types, selectOnly } = useTypeFilter(catalogue);
  const [query, setQuery] = useState("");
  const [includeClosed, setIncludeClosed] = useState(false);
  const debouncedQuery = useDebouncedValue(query);
  const abortable = useRef<AbortController>(null);

  const term = debouncedQuery.trim();

  const { data, isLoading, error } = useCachedPromise(
    async (instanceId: string | undefined, searchTerm: string, includeFinal: boolean, selectedTypes: string) => {
      const instance = instances.find((candidate) => candidate.id === instanceId);
      if (!instance || searchTerm.length === 0) return EMPTY;
      return search(instance, searchTerm, {
        types: selectedTypes.split(",").filter(Boolean),
        catalogue,
        includeFinal,
        signal: abortable.current?.signal,
      });
    },
    // Joined, not passed as an array, so the cache key is stable for an unchanged filter.
    [active?.id, term, includeClosed, types.join(",")],
    { abortable, keepPreviousData: true, initialData: EMPTY },
  );

  const result = data ?? EMPTY;
  const failure = error ? describeFailure(error, active?.label) : null;

  const commandActions = (
    <>
      <Action.Push
        title="Filter Types"
        icon={Icon.Filter}
        shortcut={OPEN_FILTERS}
        target={
          <TypeFilterList catalogue={catalogue} isLoading={loadingTypes} selected={types} onChange={selectOnly} />
        }
      />
      <Action
        title={includeClosed ? "Hide Closed Items" : "Show Closed Items"}
        icon={includeClosed ? Icon.EyeDisabled : Icon.Eye}
        shortcut={TOGGLE_CLOSED}
        onAction={() => setIncludeClosed((current) => !current)}
      />
    </>
  );

  return (
    <List
      isLoading={loadingInstances || loadingTypes || isLoading}
      searchText={query}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search Targetprocess…"
      throttle={false}
      searchBarAccessory={<InstanceDropdown instances={instances} value={active?.id} onChange={selectInstance} />}
    >
      {instances.length === 0 && !loadingInstances ? (
        <NoInstances />
      ) : failure ? (
        <List.EmptyView icon={Icon.Warning} title={failure.title} description={failure.message} />
      ) : (
        <>
          {result.exact && active ? (
            <List.Section title={`Item ${result.exact.id}`}>
              <EntityListItem item={result.exact} baseUrl={active.baseUrl} extraActions={commandActions} />
            </List.Section>
          ) : null}

          {active && result.matches.length > 0 ? (
            <List.Section title={sectionTitle(term, result)} subtitle={summariseSelection(types, catalogue)}>
              {result.matches.map((item) => (
                <EntityListItem key={item.id} item={item} baseUrl={active.baseUrl} extraActions={commandActions} />
              ))}
            </List.Section>
          ) : null}

          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={emptyTitle(term, types)}
            description={emptyDescription(term, types, includeClosed, catalogue)}
            // Must be an ActionPanel: a fragment of Actions renders nothing, and the prop is
            // typed loosely enough that the compiler will not say so.
            actions={<ActionPanel>{commandActions}</ActionPanel>}
          />
        </>
      )}
    </List>
  );
}

function sectionTitle(term: string, result: SearchResult): string {
  if (result.matches.length === 0) return "";
  return asEntityId(term) !== null ? "Also Matching That Text" : "Results";
}

function emptyTitle(term: string, types: string[]): string {
  if (types.length === 0) return "No Types Selected";
  return term.length === 0 ? "Search Targetprocess" : "No Matches";
}

function emptyDescription(term: string, types: string[], includeClosed: boolean, catalogue: EntityTypeInfo[]): string {
  if (types.length === 0) return "Every entity type is filtered out. Open Filter Types to bring some back.";

  const filter = summariseSelection(types, catalogue);
  const scope = filter ? ` Searching ${filter}.` : "";

  if (term.length === 0) return `Type part of a title, or an ID of any kind.${scope}`;
  return includeClosed
    ? `Nothing matched that. Widen the type filter if what you want is not a work item.${scope}`
    : `Nothing open matched that. Closed items are hidden, and so are types outside your filter.${scope}`;
}
