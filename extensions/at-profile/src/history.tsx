import { countOf, showError } from "@chrismessina/raycast-kit";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { HistoryActionPanels } from "./components";
import { getAppFavicon } from "./helpers/apps";
import {
  clearStarredHistoryItems,
  describeOpens,
  FAVORITE_COLOR,
  getHistoryPairKey,
  HISTORY_FILTER,
  removeHistoryItem,
  toggleStarredHistoryItem,
} from "./helpers/history";
import { openProfileWithFeedback } from "./helpers/open-profile";
import { getMigratedAppId, saveHistorySearchText, STORAGE_KEYS } from "./helpers/storage";
import { buildProfileUrl } from "./helpers/url";
import { useApps } from "./hooks/useApps";
import { useHistory } from "./hooks/useHistory";
import { formatRelativeDate } from "./utils/date";

const { ALL, STARRED } = HISTORY_FILTER;

const SEARCH_SAVE_DELAY_MS = 400;

/**
 * The search text, remembered between launches. Typing updates the list at once and saves once typing pauses,
 * instead of writing to LocalStorage on every keystroke.
 */
function useRememberedSearchText(): [string, (text: string) => void] {
  const { value: stored } = useLocalStorage<string>(STORAGE_KEYS.HISTORY_SEARCH_TEXT, "");
  const [typed, setTyped] = useState<string>();
  const unsaved = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typed === undefined) return;
    unsaved.current = typed;
    const timer = setTimeout(() => {
      unsaved.current = undefined;
      void saveHistorySearchText(typed);
    }, SEARCH_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [typed]);

  // Closing the command inside the delay still saves what was typed last
  useEffect(
    () => () => {
      if (unsaved.current !== undefined) void saveHistorySearchText(unsaved.current);
    },
    [],
  );

  return [typed ?? stored ?? "", setTyped];
}

/**
 * The profile's URL, or "" when the template no longer builds a valid one (Copy Profile URL is then hidden)
 */
function profileUrlOrEmpty(urlTemplate: string, profile: string): string {
  try {
    return buildProfileUrl(urlTemplate, profile);
  } catch {
    return "";
  }
}

export default function HistoryCommand() {
  const { history, isLoading: isLoadingHistory } = useHistory();
  const { entries, isLoading: isLoadingApps } = useApps();

  const [searchText, setSearchText] = useRememberedSearchText();
  const { value: appFilter = ALL, setValue: setAppFilter } = useLocalStorage<string>(
    STORAGE_KEYS.HISTORY_APP_FILTER,
    ALL,
  );

  // A filter remembered before this process migrated app IDs still holds the old ID; follow it to the new one
  useEffect(() => {
    if (appFilter === ALL || appFilter === STARRED) return;
    let canceled = false;
    getMigratedAppId(appFilter)
      .then((migrated) => {
        if (!canceled && migrated !== appFilter) void setAppFilter(migrated);
      })
      // A failed migration already shows a failure toast from the History load; try again on the next reload
      .catch(() => undefined);
    return () => {
      canceled = true;
    };
  }, [appFilter, history]);

  const items = useMemo(() => {
    const apps = new Map(entries.map((entry) => [entry.value, entry]));
    return history.map((item) => {
      const app = apps.get(item.app);
      const url = app ? profileUrlOrEmpty(app.urlTemplate, item.profile) : "";
      return { ...item, appName: app?.name ?? item.appName, favicon: app ? getAppFavicon(app) : Icon.Globe, url };
    });
  }, [history, entries]);

  const appOptions = useMemo(() => {
    const seen = new Map<string, (typeof items)[number]>();
    items.forEach((item) => seen.set(item.app, seen.get(item.app) ?? item));
    return Array.from(seen.values()).sort((a, b) => a.appName.localeCompare(b.appName));
  }, [items]);

  const query = searchText.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    if (appFilter === STARRED ? !item.isStarred : appFilter !== ALL && item.app !== appFilter) return false;
    return (
      !query ||
      item.profile.toLowerCase().includes(query) ||
      item.appName.toLowerCase().includes(query) ||
      item.app.toLowerCase().includes(query)
    );
  });

  const run = (title: string, operation: () => Promise<unknown>) => async () => {
    try {
      await operation();
    } catch (error) {
      await showError(error, { title });
    }
  };

  return (
    <List
      isLoading={isLoadingHistory || isLoadingApps}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search by profile or app..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by App" value={appFilter} onChange={(value) => setAppFilter(value || ALL)}>
          <List.Dropdown.Item title="Show All" value={ALL} icon={Icon.Globe} />
          <List.Dropdown.Item
            title="Favorites"
            value={STARRED}
            icon={{ source: Icon.Star, tintColor: FAVORITE_COLOR }}
          />
          {appOptions.map((item) => (
            <List.Dropdown.Item key={item.app} title={item.appName} value={item.app} icon={item.favicon} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Recent Profile History" subtitle={countOf(filteredItems.length, "item")}>
        {filteredItems.length === 0 ? (
          <List.Item title="No History Found" subtitle="No profile history matches your search" icon={Icon.Info} />
        ) : (
          filteredItems.map((item) => (
            <List.Item
              key={getHistoryPairKey(item.profile, item.app)}
              title={`@${item.profile}`}
              subtitle={item.appName}
              icon={item.favicon}
              accessories={[
                ...(item.isStarred
                  ? [{ icon: { source: Icon.Star, tintColor: FAVORITE_COLOR }, tooltip: "Favorite" }]
                  : []),
                { text: `${item.count}×`, tooltip: `Opened ${describeOpens(item.count)}` },
                {
                  text: formatRelativeDate(item.timestamp),
                  tooltip: `Last opened ${new Date(item.timestamp).toLocaleString()}`,
                },
              ]}
              actions={
                <HistoryActionPanels
                  item={item}
                  onOpenProfile={() => openProfileWithFeedback(item.profile, item.app)}
                  onDeleteHistoryItem={run("Couldn't Delete History Item", () =>
                    removeHistoryItem(item.profile, item.app),
                  )}
                  onToggleStar={run("Couldn't Update Favorites", () =>
                    toggleStarredHistoryItem(item.profile, item.app),
                  )}
                  onClearStarredProfiles={run("Couldn't Clear Favorites", clearStarredHistoryItems)}
                  onSetSearchText={setSearchText}
                  onSetAppFilter={setAppFilter}
                />
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
