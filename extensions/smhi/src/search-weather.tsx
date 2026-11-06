import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise, useFrecencySorting } from "@raycast/utils";
import { useCallback, useMemo, useRef, useState } from "react";
import { ForecastView } from "./forecast-view";
import { geocode, type GeocodeResult } from "./nominatim";
import { RenameFavoriteForm } from "./rename-favorite-form";
import { SHORTCUTS } from "./shortcuts";
import { locationId, locationTitle, makeLocation, useFavorites, useRecents, type SavedLocation } from "./storage";

const RECENTS_VISIBLE = 8;

export default function SearchWeather() {
  const [text, setText] = useState("");
  // Nominatim's usage policy forbids search-as-you-type, so a lookup only runs once the user
  // submits the query with the Search action. Typing just filters the saved places.
  const [submitted, setSubmitted] = useState("");
  const query = text.trim();
  const showSearchResults = query.length > 0 && query === submitted;

  const abortable = useRef<AbortController>(null);
  const { data: results, isLoading } = useCachedPromise(
    async (submittedQuery: string) => geocode(submittedQuery, abortable.current?.signal),
    [submitted],
    { keepPreviousData: true, abortable, execute: submitted.length > 0 },
  );

  const { favorites, addFavorite, removeFavorite, moveFavorite, renameFavorite } = useFavorites();
  const isPinned = (id: string) => favorites.some((f) => f.id === id);
  const { recents, recordVisit, forgetRecent } = useRecents();

  const recentsExcludingPinned = useMemo(
    () => recents.filter((r) => !favorites.some((f) => f.id === r.id)),
    [recents, favorites],
  );
  const { data: sortedRecents, visitItem, resetRanking } = useFrecencySorting(recentsExcludingPinned);
  const matchingFavorites = favorites.filter((favorite) => matchesQuery(favorite, query));
  const visibleRecents = sortedRecents.filter((recent) => matchesQuery(recent, query)).slice(0, RECENTS_VISIBLE);
  // Reordering a filtered list would move favorites past neighbours the user can't see.
  const canReorder = query.length === 0;

  // Why: visiting a forecast both adds the location to recents (storage) and bumps frecency.
  const onVisit = useCallback(
    async (location: SavedLocation) => {
      await recordVisit(location);
      await visitItem(location);
    },
    [recordVisit, visitItem],
  );

  return (
    <List
      isLoading={isLoading && showSearchResults}
      searchBarPlaceholder="Search a place − Stockholm, Göteborg, Tromsø…"
      onSearchTextChange={setText}
    >
      {!showSearchResults && query.length > 0 && (
        <List.Item
          title={`Search for “${query}”`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setSubmitted(query)} />
            </ActionPanel>
          }
        />
      )}

      {!showSearchResults && matchingFavorites.length > 0 && (
        <List.Section title="Favorites">
          {matchingFavorites.map((favorite, index) => (
            <SavedLocationItem
              key={favorite.id}
              location={favorite}
              icon={Icon.Star}
              pinned
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              renameFavorite={renameFavorite}
              onVisit={onVisit}
              reorder={
                canReorder
                  ? {
                      moveUp: index > 0 ? () => moveFavorite(favorite.id, -1) : undefined,
                      moveDown: index < favorites.length - 1 ? () => moveFavorite(favorite.id, 1) : undefined,
                    }
                  : undefined
              }
            />
          ))}
        </List.Section>
      )}

      {!showSearchResults && visibleRecents.length > 0 && (
        <List.Section title="Recent">
          {visibleRecents.map((recent) => (
            <SavedLocationItem
              key={recent.id}
              location={recent}
              icon={Icon.Clock}
              pinned={isPinned(recent.id)}
              addFavorite={addFavorite}
              removeFavorite={removeFavorite}
              renameFavorite={renameFavorite}
              onVisit={onVisit}
              onResetRanking={() => resetRanking(recent)}
              onForget={() => forgetRecent(recent.id)}
            />
          ))}
        </List.Section>
      )}

      {query.length === 0 && favorites.length === 0 && visibleRecents.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Type a place name"
          description="Press ↵ to search. Star a forecast (⌘F) to pin it here for next time."
        />
      )}

      {showSearchResults && results && results.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No matches" description="Try a more specific place name." />
      )}

      {showSearchResults &&
        results &&
        results.map((result, idx) => (
          <SearchResultItem
            key={`${result.lat},${result.lon},${idx}`}
            result={result}
            pinned={isPinned(locationId(result.lat, result.lon))}
            addFavorite={addFavorite}
            removeFavorite={removeFavorite}
            onVisit={onVisit}
          />
        ))}
    </List>
  );
}

function matchesQuery(location: SavedLocation, query: string): boolean {
  const needle = query.toLowerCase();
  return [location.nickname, location.label].some((name) => name?.toLowerCase().includes(needle));
}

interface ItemActionDeps {
  pinned: boolean;
  addFavorite: (location: SavedLocation) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  onVisit: (item: SavedLocation) => Promise<void>;
}

interface ReorderActions {
  moveUp?: () => Promise<void>;
  moveDown?: () => Promise<void>;
}

function SavedLocationItem({
  location,
  icon,
  pinned,
  addFavorite,
  removeFavorite,
  renameFavorite,
  onVisit,
  onResetRanking,
  onForget,
  reorder,
}: {
  location: SavedLocation;
  icon: Icon;
  renameFavorite: (id: string, nickname: string) => Promise<void>;
  onResetRanking?: () => Promise<void>;
  onForget?: () => Promise<void>;
  reorder?: ReorderActions;
} & ItemActionDeps) {
  const title = locationTitle(location);
  return (
    <List.Item
      title={title}
      subtitle={location.nickname ? location.label : undefined}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Forecast"
            icon={Icon.Cloud}
            onPush={() => onVisit(location)}
            target={<ForecastView lat={location.lat} lon={location.lon} label={location.label} />}
          />
          <Action
            title={pinned ? "Remove from Favorites" : "Add to Favorites"}
            icon={pinned ? Icon.StarDisabled : Icon.Star}
            shortcut={SHORTCUTS.toggleFavorite}
            onAction={() => (pinned ? removeFavorite(location.id) : addFavorite(location))}
          />
          {pinned && (
            <Action.Push
              title="Rename Favorite"
              icon={Icon.Pencil}
              shortcut={Keyboard.Shortcut.Common.Edit}
              target={<RenameFavoriteForm location={location} onSubmit={renameFavorite} />}
            />
          )}
          {reorder?.moveUp && (
            <Action
              title="Move Up"
              icon={Icon.ArrowUp}
              shortcut={Keyboard.Shortcut.Common.MoveUp}
              onAction={reorder.moveUp}
            />
          )}
          {reorder?.moveDown && (
            <Action
              title="Move Down"
              icon={Icon.ArrowDown}
              shortcut={Keyboard.Shortcut.Common.MoveDown}
              onAction={reorder.moveDown}
            />
          )}
          {onResetRanking && (
            <Action
              title="Reset Ranking"
              icon={Icon.ArrowCounterClockwise}
              shortcut={SHORTCUTS.resetRanking}
              onAction={onResetRanking}
            />
          )}
          {onForget && (
            <Action
              title="Remove from Recents"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={onForget}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

// Nominatim's display name leads with the place name, so the row read "Stockholm" above
// "Stockholm, Stockholms kommun, …". Drop the repeated prefix and keep the part that adds information.
function resultSubtitle(label: string, displayName: string): string | undefined {
  switch (true) {
    case displayName === label:
      return undefined;
    case displayName.startsWith(`${label}, `):
      return displayName.slice(label.length + 2);
    default:
      return displayName;
  }
}

function SearchResultItem({
  result,
  pinned,
  addFavorite,
  removeFavorite,
  onVisit,
}: { result: GeocodeResult } & ItemActionDeps) {
  const label = result.name || result.displayName;
  const location = makeLocation(result.lat, result.lon, label);
  const subtitle = resultSubtitle(label, result.displayName);
  return (
    <List.Item
      title={label}
      subtitle={subtitle}
      icon={Icon.Geopin}
      accessories={result.addressType ? [{ tag: result.addressType }] : undefined}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Forecast"
            icon={Icon.Cloud}
            onPush={() => onVisit(location)}
            target={<ForecastView lat={result.lat} lon={result.lon} label={label} />}
          />
          <Action
            title={pinned ? "Remove from Favorites" : "Add to Favorites"}
            icon={pinned ? Icon.StarDisabled : Icon.Star}
            shortcut={SHORTCUTS.toggleFavorite}
            onAction={() => (pinned ? removeFavorite(location.id) : addFavorite(location))}
          />
        </ActionPanel>
      }
    />
  );
}
