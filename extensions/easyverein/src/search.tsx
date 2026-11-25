import { Icon, List, LocalStorage, open, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise, usePromise } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { fetchOrganizationShort, getAccountKey, getBaseUrl, searchEntities, SearchResult } from "./api";
import { describeError, errorKind } from "./errors";
import { toIcon } from "./icons";
import { MenuRow } from "./parts/MenuRow";
import { SearchErrorView } from "./parts/SearchErrorView";
import { addRecentItem, readRecentItems } from "./recentItems";
import { SearchContext } from "./search.context";
import { filterItems } from "./shared/fuzzyMatch";
import { nestItems } from "./shared/nesting";
import {
  ENTITY_TYPES,
  GROUPS,
  matchScopePrefix,
  MenuItem,
  REGISTRY_ITEMS,
  registryToMenuItem,
} from "./shared/registry";
import { useDebouncedValue } from "./useDebouncedValue";

const MAX_STATIC_RESULTS = 8;
const MIN_QUERY_LENGTH = 2;
const ALL_SCOPE = "all";
const SEARCH_DEBOUNCE_MS = 200;
const SECTION_TITLES: Record<string, string> = {
  navigation: "Navigation",
  settings: "Settings",
  actions: "Actions",
};

function resultToMenuItem(result: SearchResult): MenuItem {
  const entityType = ENTITY_TYPES.find((type) => type.key === result.type);
  return {
    id: `${result.type}:${result.id}`,
    label: result.title,
    subtitle: result.subtitle,
    icon: entityType?.icon ?? "fa-circle",
    url: result.url,
    secondaryUrl: result.secondary_url,
  };
}

function showApiError(error: Error) {
  const { title, message, needsPreferences } = describeError(error);
  return showFailureToast(error, {
    title,
    message,
    primaryAction: needsPreferences
      ? { title: "Open Extension Preferences", onAction: () => openExtensionPreferences() }
      : undefined,
  });
}

export default function Command() {
  const baseUrl = getBaseUrl();
  const [searchText, setSearchText] = useState("");
  const [dropdownScope, setDropdownScope] = useState(ALL_SCOPE);
  const abortable = useRef<AbortController>(null);
  const shownError = useRef<string | null>(null);

  const { data: recentItems = [], revalidate: reloadRecent } = usePromise(readRecentItems);

  const prefix = matchScopePrefix(ENTITY_TYPES, searchText);
  const scope = prefix?.entityType ?? ENTITY_TYPES.find((type) => type.key === dropdownScope) ?? null;
  const query = (prefix ? prefix.rest : searchText).trim();
  const searchQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const orgShortKey = `organization:short:${getAccountKey()}`;

  const { data: orgShort } = useCachedPromise(
    async (key: string) => {
      const cached = await LocalStorage.getItem<string>(key);
      if (cached) {
        return cached;
      }
      const short = await fetchOrganizationShort();
      if (short) {
        await LocalStorage.setItem(key, short);
      }
      return short;
    },
    [orgShortKey],
    { onError: () => undefined },
  );

  const {
    data: results = [],
    isLoading,
    error,
    revalidate: retrySearch,
  } = usePromise(
    async (text: string, typeKey: string | null) => {
      if (text.length < MIN_QUERY_LENGTH) {
        return [];
      }
      const found = await searchEntities(text, typeKey, abortable.current?.signal);
      shownError.current = null;
      return found;
    },
    [searchQuery, scope?.key ?? null],
    {
      abortable,
      onError: (error) => {
        if (error.name === "AbortError" || shownError.current === errorKind(error)) {
          return;
        }
        shownError.current = errorKind(error);
        showApiError(error);
      },
    },
  );

  const resolveUrl = (item: MenuItem) => {
    if (item.dynamicUrl) {
      return orgShort ? `${baseUrl}/public/${orgShort}/` : null;
    }
    return /^https?:\/\//.test(item.url) ? item.url : `${baseUrl}${item.url}`;
  };

  const openItem = async (item: MenuItem, url: string | null) => {
    if (!url) {
      await showToast({ style: Toast.Style.Failure, title: "Address not available" });
      return;
    }
    await open(url);
    await addRecentItem(item);
    reloadRecent();
  };

  const rankedStatic = useMemo(
    () => (scope || !query ? [] : filterItems(REGISTRY_ITEMS, query, MAX_STATIC_RESULTS)),
    [scope, query],
  );
  const { items: staticItems, rows: staticNesting } = useMemo(
    () => nestItems(rankedStatic, REGISTRY_ITEMS),
    [rankedStatic],
  );

  const staticGroups = GROUPS.filter((group) => staticItems.some((item) => item.group === group.key)).sort(
    (first, second) =>
      staticItems.findIndex((item) => item.group === first.key) -
      staticItems.findIndex((item) => item.group === second.key),
  );

  const entitySections = ENTITY_TYPES.map((type) => ({
    type,
    items: results.filter((result) => result.type === type.key).map(resultToMenuItem),
  })).filter((section) => section.items.length);

  const showEmptyState = !query && !scope;

  return (
    <SearchContext.Provider value={{ resolveUrl, openItem, reloadRecent }}>
      <List
        filtering={false}
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Search or start with a prefix like M: or R:"
        searchBarAccessory={
          <List.Dropdown tooltip="Filter by Type" value={dropdownScope} onChange={setDropdownScope}>
            <List.Dropdown.Item title="All" value={ALL_SCOPE} />
            {ENTITY_TYPES.map((type) => (
              <List.Dropdown.Item key={type.key} title={type.label} value={type.key} icon={toIcon(type.icon)} />
            ))}
          </List.Dropdown>
        }
      >
        {showEmptyState ? (
          <>
            <List.Section title="Recently Opened">
              {recentItems.map((item) => (
                <MenuRow key={`recent:${item.id}`} item={item} section="recent" removable />
              ))}
            </List.Section>
            {GROUPS.map((group) => (
              <List.Section key={group.key} title={SECTION_TITLES[group.key]}>
                {REGISTRY_ITEMS.filter((item) => item.group === group.key).map((item) => (
                  <MenuRow
                    key={`${group.key}:${item.id}`}
                    item={registryToMenuItem(
                      item,
                      item.parent ? REGISTRY_ITEMS.find((parent) => parent.id === item.parent)?.label : null,
                    )}
                    section={group.key}
                  />
                ))}
              </List.Section>
            ))}
          </>
        ) : (
          <>
            {staticGroups.map((group) => (
              <List.Section key={group.key} title={SECTION_TITLES[group.key]}>
                {staticItems
                  .filter((item) => item.group === group.key)
                  .map((item) => {
                    const nesting = staticNesting.get(item.id);
                    const menuItem = registryToMenuItem(
                      nesting?.nested ? { ...item, label: item.shortLabel ?? item.label } : item,
                    );
                    return (
                      <MenuRow key={`${group.key}:${item.id}`} item={menuItem} section={group.key} nesting={nesting} />
                    );
                  })}
              </List.Section>
            ))}
            {entitySections.map((section) => (
              <List.Section key={section.type.key} title={section.type.label}>
                {section.items.map((item) => (
                  <MenuRow key={`${section.type.key}:${item.id}`} item={item} section={section.type.key} />
                ))}
              </List.Section>
            ))}
            {query.length < MIN_QUERY_LENGTH ? (
              <List.EmptyView title="Enter a search term" icon={Icon.MagnifyingGlass} />
            ) : error && error.name !== "AbortError" ? (
              <SearchErrorView error={error} onRetry={retrySearch} />
            ) : (
              !isLoading && <List.EmptyView title="No results" icon={Icon.MagnifyingGlass} />
            )}
          </>
        )}
      </List>
    </SearchContext.Provider>
  );
}
