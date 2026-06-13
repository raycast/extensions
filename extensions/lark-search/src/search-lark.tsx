import {
  Action,
  ActionPanel,
  Clipboard,
  closeMainWindow,
  Icon,
  LaunchProps,
  List,
  Toast,
  open,
  showToast,
} from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchLark } from "./lib/lark-cli";
import { larkIconForItem } from "./lib/lark-icons";
import {
  filterRecents,
  getCachedSearchResults,
  getRecents,
  recordOpen,
  recordSearchResults,
} from "./lib/recent-cache";
import { upsertOpenedItemInHotIndex } from "./lib/hot-index";
import {
  getOpenBundleIds,
  getQuicklinkApplicationName,
} from "./lib/preferences";
import { parseSearchPrefix } from "./lib/prefix";
import {
  LarkSearchItem,
  SearchScope,
  SearchScopeFilter,
  scopeTitles,
  typeLabels,
} from "./lib/types";

type SearchArguments = {
  query?: string;
};

const execFileAsync = promisify(execFile);
const PEOPLE_GROUP_PREVIEW_LIMIT = 8;
const sectionOrder = ["message", "doc", "wiki", "sheet"] as const;

export default function Command(
  props: LaunchProps<{ arguments: SearchArguments }>,
) {
  const initialQuery = props.fallbackText ?? props.arguments?.query ?? "";
  const [searchText, setSearchText] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>("all");
  const [recents, setRecents] = useState<LarkSearchItem[]>([]);
  const [liveResults, setLiveResults] = useState<LarkSearchItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const requestId = useRef(0);

  const parsed = useMemo(
    () => parseSearchPrefix(searchText, scope),
    [searchText, scope],
  );
  const visibleRecents = useMemo(
    () => filterRecents(recents, parsed.query, parsed.scopes),
    [recents, parsed],
  );
  const visibleLiveResults = useMemo(() => {
    const recentKeys = new Set(visibleRecents.map(itemIdentityKey));
    return liveResults.filter((item) => !recentKeys.has(itemIdentityKey(item)));
  }, [liveResults, visibleRecents]);
  const sections = useMemo(
    () =>
      buildSections(
        [...visibleRecents, ...visibleLiveResults],
        parsed.scopes,
        parsed.hasTypeFilters,
      ),
    [parsed.hasTypeFilters, parsed.scopes, visibleLiveResults, visibleRecents],
  );

  useEffect(() => {
    getRecents().then(setRecents);
  }, []);

  useEffect(() => {
    const query = parsed.query.trim();
    const currentRequest = ++requestId.current;
    setError(undefined);

    if (!query) {
      setLiveResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getCachedSearchResults(query, parsed.scopeKey).then((cachedResults) => {
      if (requestId.current === currentRequest && cachedResults.length > 0) {
        setLiveResults(cachedResults);
      }
    });
    const timer = setTimeout(() => {
      searchLark(query, parsed.scopes)
        .then((results) => {
          if (requestId.current === currentRequest) {
            setLiveResults(results);
            recordSearchResults(query, parsed.scopeKey, results);
          }
        })
        .catch((unknownError) => {
          if (requestId.current === currentRequest) {
            setLiveResults([]);
            setError(
              unknownError instanceof Error
                ? unknownError.message
                : "Search failed",
            );
          }
        })
        .finally(() => {
          if (requestId.current === currentRequest) {
            setIsLoading(false);
          }
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [parsed]);

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Lark, append /doc /msg /im to filter"
      searchBarAccessory={<ScopeDropdown scope={scope} setScope={setScope} />}
      throttle
    >
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Search failed"
          description={error}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard title="Copy Error" content={error} />
            </ActionPanel>
          }
        />
      ) : null}

      {!error && !parsed.query ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Lark"
          description="Type a query, or append /doc /msg /im to filter."
        />
      ) : null}

      {!error
        ? sections.map((section) => (
            <List.Section key={section.type} title={section.title}>
              {section.items.map((item) => (
                <SearchItem
                  key={`${item.source}-${item.id}`}
                  item={item}
                  onOpened={() => refreshRecents(setRecents)}
                />
              ))}
            </List.Section>
          ))
        : null}
    </List>
  );
}

function buildSections(
  items: LarkSearchItem[],
  scopes: SearchScopeFilter,
  hasTypeFilters: boolean,
) {
  const scopeSet = new Set(scopes);
  const sections: { type: string; title: string; items: LarkSearchItem[] }[] =
    [];

  if (scopeSet.has("contact") && scopeSet.has("chat")) {
    const peopleAndGroups = interleavePeopleAndGroups(items);
    sections.push({
      type: "people-and-groups",
      title: "联系人 / 群组",
      items: hasTypeFilters
        ? peopleAndGroups
        : peopleAndGroups.slice(0, PEOPLE_GROUP_PREVIEW_LIMIT),
    });
  } else if (scopeSet.has("contact") || scopeSet.has("chat")) {
    const type = scopeSet.has("contact") ? "contact" : "chat";
    sections.push({
      type,
      title: scopeTitles[type],
      items: sortByRank(items.filter((item) => item.type === type)),
    });
  }

  for (const type of sectionOrder) {
    const shouldShowDocumentType =
      (type === "doc" || type === "wiki" || type === "sheet") &&
      scopeSet.has("doc");
    if (!scopeSet.has(type) && !shouldShowDocumentType) {
      continue;
    }
    sections.push({
      type,
      title: scopeTitles[type],
      items: sortByRank(items.filter((item) => item.type === type)),
    });
  }

  return sections.filter((section) => section.items.length > 0);
}

function interleavePeopleAndGroups(items: LarkSearchItem[]) {
  const contacts = sortByRank(items.filter((item) => item.type === "contact"));
  const chats = sortByRank(items.filter((item) => item.type === "chat"));
  const maxLength = Math.max(contacts.length, chats.length);
  const mixed: LarkSearchItem[] = [];

  for (let index = 0; index < maxLength; index += 1) {
    const pair = [contacts[index], chats[index]].filter(
      Boolean,
    ) as LarkSearchItem[];
    mixed.push(...pair.sort((a, b) => b.rankScore - a.rankScore));
  }

  return mixed;
}

function sortByRank(items: LarkSearchItem[]) {
  return items
    .slice()
    .sort(
      (a, b) => b.rankScore - a.rankScore || a.title.localeCompare(b.title),
    );
}

function ScopeDropdown({
  scope,
  setScope,
}: {
  scope: SearchScope;
  setScope: (scope: SearchScope) => void;
}) {
  return (
    <List.Dropdown
      tooltip="Search Scope"
      value={scope}
      onChange={(value) => setScope(value as SearchScope)}
    >
      {(Object.keys(scopeTitles) as SearchScope[]).map((value) => (
        <List.Dropdown.Item
          key={value}
          title={scopeTitles[value]}
          value={value}
        />
      ))}
    </List.Dropdown>
  );
}

function SearchItem({
  item,
  onOpened,
}: {
  item: LarkSearchItem;
  onOpened: () => void;
}) {
  const subtitle = [item.subtitle, item.snippet].filter(Boolean).join("  ·  ");

  return (
    <List.Item
      icon={larkIconForItem(item)}
      title={item.title}
      subtitle={subtitle}
      accessories={[
        item.appName ? { text: item.appName } : {},
        item.source === "recent" ? { text: "最近打开" } : {},
        item.updatedAt ? { text: item.updatedAt } : {},
      ]}
      actions={<ItemActions item={item} onOpened={onOpened} />}
    />
  );
}

function ItemActions({
  item,
  onOpened,
}: {
  item: LarkSearchItem;
  onOpened: () => void;
}) {
  return (
    <ActionPanel>
      <Action
        title="Open"
        icon={Icon.ArrowRight}
        onAction={async () => {
          if (!item.url) {
            await showToast({
              style: Toast.Style.Failure,
              title: "No URL available for this result",
            });
            return;
          }

          await recordOpen(item);
          await upsertOpenedItemInHotIndex(item).catch(() => undefined);
          onOpened();
          await openLarkItem(item);
          await closeMainWindow({ clearRootSearch: true });
        }}
      />
      {item.url ? (
        <Action.CreateQuicklink
          title="Add to Root Search Quicklink"
          quicklink={buildQuicklink(item)}
          shortcut={{ modifiers: ["cmd"], key: "r" }}
        />
      ) : null}
      {item.url ? (
        <Action.CopyToClipboard
          title="Copy Link"
          content={item.url}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
        />
      ) : null}
      <Action.CopyToClipboard
        title="Copy Title"
        content={item.title}
        shortcut={{ modifiers: ["cmd"], key: "c" }}
      />
      <Action
        title="Copy Raw JSON"
        icon={Icon.Clipboard}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
        onAction={async () => {
          await Clipboard.copy(JSON.stringify(item.raw, null, 2));
          await showToast({
            style: Toast.Style.Success,
            title: "Copied raw JSON",
          });
        }}
      />
    </ActionPanel>
  );
}

async function refreshRecents(setRecents: (items: LarkSearchItem[]) => void) {
  setRecents(await getRecents());
}

function buildQuicklink(item: LarkSearchItem) {
  const appName = item.appName ?? "Lark";
  return {
    name: `${appName} ${typeLabels[item.type]} ${item.title}`,
    link: item.url ?? "",
    application: shouldOpenInLark(item)
      ? (item.applicationName ?? getQuicklinkApplicationName())
      : undefined,
  };
}

async function openLarkItem(item: LarkSearchItem) {
  if (!item.url) {
    return;
  }

  if (!shouldOpenInLark(item)) {
    await open(item.url);
    return;
  }

  const bundleIds = item.bundleId ? [item.bundleId] : getOpenBundleIds();

  for (const bundleId of bundleIds) {
    try {
      await execFileAsync("/usr/bin/open", ["-b", bundleId, item.url], {
        timeout: 5000,
      });
      return;
    } catch {
      continue;
    }
  }

  await open(item.url);
}

function itemIdentityKey(item: LarkSearchItem) {
  return `${item.appTargetKey ?? item.appName ?? "lark"}:${item.url ?? item.id}`;
}

function shouldOpenInLark(item: LarkSearchItem) {
  return (
    item.type === "chat" || item.type === "message" || item.type === "contact"
  );
}
