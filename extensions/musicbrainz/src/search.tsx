import { Action, ActionPanel, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { getEntityName, resolveEntityByMbid, searchEntities } from "./api/musicbrainz";
import { EntityTypeDropdown } from "./components/EntityTypeDropdown";
import { getDetailTarget, SearchResultItem } from "./components/SearchResultItem";
import { addRecentLookup, useRecentLookups } from "./hooks/useRecentLookups";
import { EntityType, SearchResult } from "./types";
import { formatRelativeTime, getEntityIcon, getEntityTypeLabel, parseMusicBrainzInput } from "./utils";

import { MBArtist, MBLabel, MBRecording, MBRelease, MBReleaseGroupFull, MBWork } from "./types";
import { EntityActions } from "./components/EntityActions";

interface DirectLookupResult {
  type: EntityType;
  entity: SearchResult;
}

function getMinimalEntity(entityType: EntityType, mbid: string, name: string): SearchResult {
  const base = { id: mbid, score: 0 };

  switch (entityType) {
    case "artist":
      return { ...base, name, "sort-name": name } as MBArtist;
    case "release":
      return { ...base, title: name } as MBRelease;
    case "recording":
      return { ...base, title: name } as MBRecording;
    case "release-group":
      return { ...base, title: name } as MBReleaseGroupFull;
    case "label":
      return { ...base, name } as MBLabel;
    case "work":
      return { ...base, title: name } as MBWork;
  }
}

export default function SearchMusicBrainz() {
  const [entityType, setEntityType] = useState<EntityType>("artist");
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [directResult, setDirectResult] = useState<DirectLookupResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const entityTypeRef = useRef<EntityType>(entityType);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const { recents, clearRecents, revalidate: revalidateRecents, isLoading: isLoadingRecents } = useRecentLookups();

  const handleEntityTypeChange = useCallback((type: EntityType) => {
    if (type === entityTypeRef.current) {
      return;
    }

    entityTypeRef.current = type;
    setResults([]);
    setDirectResult(null);
    setEntityType(type);
  }, []);

  const performSearch = useCallback(async (query: string, type: EntityType, signal: AbortSignal) => {
    try {
      const data = await searchEntities(type, query, 25, signal);

      if (!signal.aborted) {
        setResults(data);
        setDirectResult(null);
        setIsLoading(false);
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      if (!signal.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  const performDirectLookup = useCallback(async (mbid: string, type: EntityType | null, signal: AbortSignal) => {
    try {
      const resolved = await resolveEntityByMbid(mbid, type, signal);

      if (!signal.aborted) {
        if (resolved) {
          setDirectResult({ type: resolved.type, entity: resolved.entity });
          setResults([]);
        } else {
          setDirectResult(null);
        }

        setIsLoading(false);
      }
    } catch {
      if (!signal.aborted) {
        setDirectResult(null);
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedId) {
      setSelectedId(undefined);
    }

    if (!searchText.trim()) {
      setResults([]);
      setDirectResult(null);
      setIsLoading(false);

      return;
    }

    setIsLoading(true);

    const controller = new AbortController();
    const parsed = parseMusicBrainzInput(searchText);

    if (parsed) {
      performDirectLookup(parsed.mbid, parsed.entityType, controller.signal);
    } else {
      performSearch(searchText, entityType, controller.signal);
    }

    return () => {
      controller.abort();
    };
  }, [searchText, entityType, performSearch, performDirectLookup]);

  const isDirectLookup = !!parseMusicBrainzInput(searchText);
  const entityLabel = getEntityTypeLabel(entityType);
  const showRecents = searchText.trim() === "" && recents.length > 0;

  function makeOnViewDetails(et: EntityType, result: SearchResult) {
    const name = getEntityName(et, result);

    return () => {
      addRecentLookup({ entityType: et, mbid: result.id, name, subtitle: "" });
    };
  }

  return (
    <List
      isLoading={isLoading || isLoadingRecents}
      selectedItemId={selectedId}
      searchBarPlaceholder={`Search MusicBrainz for ${entityLabel.toLowerCase()}s...`}
      searchBarAccessory={
        isDirectLookup ? undefined : <EntityTypeDropdown onEntityTypeChange={handleEntityTypeChange} />
      }
      onSearchTextChange={setSearchText}
      throttle
      filtering={false}
    >
      {showRecents ? (
        <List.Section title="Recent" subtitle={`${recents.length} items`}>
          {recents.map((recent) => {
            const entity = getMinimalEntity(recent.entityType, recent.mbid, recent.name);
            const detailTarget = getDetailTarget(recent.entityType, entity);

            return (
              <List.Item
                key={recent.mbid}
                id={recent.mbid}
                title={recent.name}
                subtitle={recent.subtitle}
                icon={getEntityIcon(recent.entityType)}
                accessories={[
                  { text: formatRelativeTime(recent.timestamp), icon: Icon.Clock },
                  { tag: getEntityTypeLabel(recent.entityType) },
                ]}
                actions={
                  <EntityActions
                    entityType={recent.entityType}
                    mbid={recent.mbid}
                    name={recent.name}
                    detailTarget={detailTarget}
                    onViewDetails={() =>
                      addRecentLookup({
                        entityType: recent.entityType,
                        mbid: recent.mbid,
                        name: recent.name,
                        subtitle: recent.subtitle,
                      })
                    }
                    onPop={async () => {
                      await revalidateRecents();
                      setSelectedId(recent.mbid);
                    }}
                  >
                    <ActionPanel.Section>
                      <Action
                        title="Clear Recent Lookups"
                        icon={Icon.Trash}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "delete" }}
                        onAction={async () => {
                          await clearRecents();
                          await showToast({ style: Toast.Style.Success, title: "Recent lookups cleared" });
                        }}
                      />
                    </ActionPanel.Section>
                  </EntityActions>
                }
              />
            );
          })}
        </List.Section>
      ) : searchText.trim() === "" ? (
        <List.EmptyView title="Search MusicBrainz" description={`Type to search for ${entityLabel.toLowerCase()}s`} />
      ) : directResult ? (
        <List.Section title="Direct Lookup" subtitle="1 result">
          <SearchResultItem
            entityType={directResult.type}
            result={directResult.entity}
            onViewDetails={makeOnViewDetails(directResult.type, directResult.entity)}
            onPop={revalidateRecents}
          />
        </List.Section>
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView title="No Results" description={`No ${entityLabel.toLowerCase()}s found for "${searchText}"`} />
      ) : results.length > 0 ? (
        <List.Section title={`${entityLabel}s`} subtitle={`${results.length} results`}>
          {results.map((result) => (
            <SearchResultItem
              key={result.id}
              entityType={entityType}
              result={result}
              onViewDetails={makeOnViewDetails(entityType, result)}
              onPop={revalidateRecents}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
