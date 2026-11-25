import {
  Icon,
  List,
  LocalStorage,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  fetchOrganizationShort,
  getAccountKey,
  getBaseUrl,
  searchEntities,
  SearchResult,
} from "./api";
import { filterItems } from "./shared/fuzzyMatch";
import { toIcon } from "./icons";
import { MenuRow } from "./parts/MenuRow";
import { SearchContext } from "./search.context";
import { nestItems } from "./shared/nesting";
import { addRecentItem, readRecentItems } from "./recentItems";
import { useDebouncedValue } from "./useDebouncedValue";
import {
  ENTITY_TYPES,
  GROUPS,
  matchScopePrefix,
  MenuItem,
  REGISTRY_ITEMS,
  registryToMenuItem,
} from "./shared/registry";

const MAX_STATIC_RESULTS = 8;
const MIN_QUERY_LENGTH = 2;
const ALL_SCOPE = "all";
const SEARCH_DEBOUNCE_MS = 200;

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

function errorKind(error: Error): string {
  return error instanceof ApiError ? String(error.status) : "network";
}

async function showApiError(error: Error) {
  const status = error instanceof ApiError ? error.status : null;
  const title =
    status === 401
      ? "API-Schlüssel ungültig"
      : status === 403
        ? "Suche nur für Vorstände"
        : status === 429
          ? "Zu viele Anfragen, bitte kurz warten"
          : status
            ? `Suche fehlgeschlagen (${status})`
            : "easyVerein nicht erreichbar";
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: status ? undefined : "Seiten und Einstellungen bleiben nutzbar.",
    primaryAction:
      status === 401 || status === 403 || !status
        ? { title: "Einstellungen öffnen", onAction: () => openExtensionPreferences() }
        : undefined,
  });
}

export default function Command() {
  const baseUrl = getBaseUrl();
  const [searchText, setSearchText] = useState("");
  const [dropdownScope, setDropdownScope] = useState(ALL_SCOPE);
  const [recentItems, setRecentItems] = useState<MenuItem[]>([]);
  const abortable = useRef<AbortController>(null);
  const shownError = useRef<string | null>(null);

  useEffect(() => {
    readRecentItems().then(setRecentItems);
  }, []);

  const prefix = matchScopePrefix(ENTITY_TYPES, searchText);
  const scope =
    prefix?.entityType ?? ENTITY_TYPES.find((type) => type.key === dropdownScope) ?? null;
  const query = (prefix ? prefix.rest : searchText).trim();
  const searchQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const orgShortKey = `organization:short:${getAccountKey()}`;

  const { data: orgShort } = useCachedPromise(
    async () => {
      const cached = await LocalStorage.getItem<string>(orgShortKey);
      if (cached) {
        return cached;
      }
      const short = await fetchOrganizationShort();
      if (short) {
        await LocalStorage.setItem(orgShortKey, short);
      }
      return short;
    },
    [],
    { onError: () => undefined },
  );

  const { data: results = [], isLoading } = usePromise(
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
      await showToast({ style: Toast.Style.Failure, title: "Adresse nicht verfügbar" });
      return;
    }
    await open(url);
    setRecentItems(await addRecentItem(item));
  };

  const rankedStatic = useMemo(
    () => (scope || !query ? [] : filterItems(REGISTRY_ITEMS, query, MAX_STATIC_RESULTS)),
    [scope, query],
  );
  const { items: staticItems, rows: staticNesting } = useMemo(
    () => nestItems(rankedStatic, REGISTRY_ITEMS),
    [rankedStatic],
  );

  const staticGroups = GROUPS.filter((group) =>
    staticItems.some((item) => item.group === group.key),
  ).sort(
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
    <SearchContext.Provider value={{ resolveUrl, openItem, setRecentItems }}>
      <List
        filtering={false}
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        searchBarPlaceholder="Suchen oder Präfix wie M: oder R: …"
        searchBarAccessory={
          <List.Dropdown
            tooltip="Suche eingrenzen"
            value={dropdownScope}
            onChange={setDropdownScope}
          >
            <List.Dropdown.Item title="Alle" value={ALL_SCOPE} />
            {ENTITY_TYPES.map((type) => (
              <List.Dropdown.Item
                key={type.key}
                title={type.label}
                value={type.key}
                icon={toIcon(type.icon)}
              />
            ))}
          </List.Dropdown>
        }
      >
        {showEmptyState ? (
          <>
            <List.Section title="Zuletzt geöffnet">
              {recentItems.map((item) => (
                <MenuRow key={`recent:${item.id}`} item={item} section="recent" removable />
              ))}
            </List.Section>
            {GROUPS.map((group) => (
              <List.Section key={group.key} title={group.title}>
                {REGISTRY_ITEMS.filter((item) => item.group === group.key).map((item) => (
                  <MenuRow
                    key={`${group.key}:${item.id}`}
                    item={registryToMenuItem(
                      item,
                      item.parent
                        ? REGISTRY_ITEMS.find((parent) => parent.id === item.parent)?.label
                        : null,
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
              <List.Section key={group.key} title={group.title}>
                {staticItems
                  .filter((item) => item.group === group.key)
                  .map((item) => {
                    const nesting = staticNesting.get(item.id);
                    const menuItem = registryToMenuItem(
                      nesting?.nested ? { ...item, label: item.shortLabel ?? item.label } : item,
                    );
                    return (
                      <MenuRow
                        key={`${group.key}:${item.id}`}
                        item={menuItem}
                        section={group.key}
                        nesting={nesting}
                      />
                    );
                  })}
              </List.Section>
            ))}
            {entitySections.map((section) => (
              <List.Section key={section.type.key} title={section.type.label}>
                {section.items.map((item) => (
                  <MenuRow
                    key={`${section.type.key}:${item.id}`}
                    item={item}
                    section={section.type.key}
                  />
                ))}
              </List.Section>
            ))}
            {query.length < MIN_QUERY_LENGTH ? (
              <List.EmptyView title="Suchbegriff eingeben" icon={Icon.MagnifyingGlass} />
            ) : (
              !isLoading && <List.EmptyView title="Nichts gefunden" icon={Icon.MagnifyingGlass} />
            )}
          </>
        )}
      </List>
    </SearchContext.Provider>
  );
}
