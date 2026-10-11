import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  Detail,
  Icon,
  Image,
  Keyboard,
  List,
  open,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import {
  deleteDocument,
  DocumentType,
  getPreview,
  getRecentSearches,
  HisterDocument,
  HisterError,
  HistoryEntry,
  recordOpen,
  search,
  serverUrl,
  webSearchUrl,
} from "./api";
import { DisableIndexingForm } from "./disable-indexing";
import { RulesList } from "./rules-list";
import { useCurrentTab } from "./lib/current-tab";
import { useFavicons } from "./lib/favicons";
import { previewMarkdown } from "./lib/preview";
import {
  getLocalSearches,
  hideRecentSearches,
  mergeRecentSearches,
  saveRecentSearch,
  togglePinnedSearch,
} from "./lib/searches";
import { snippetMarkdown } from "./lib/text";

const limit = 50;
const queryDocsUrl = "https://hister.org/docs/query-language";

const sorts = [
  { title: "Relevance", value: "relevance" },
  { title: "Newest First", value: "date" },
  { title: "Oldest First", value: "-date" },
  { title: "Most Visited", value: "visits" },
];

type Result = {
  url: string;
  title: string;
  documentId?: string;
  pinned?: boolean;
  document?: HisterDocument;
};

function toDate(seconds?: number): Date | undefined {
  return seconds ? new Date(seconds * 1000) : undefined;
}

function fallbackIcon(document?: HisterDocument): Image.ImageLike {
  return document && document.type !== DocumentType.Web ? Icon.Document : Icon.Globe;
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const rulesAction = (
    <Action.Push
      title="Manage Rules"
      icon={Icon.Filter}
      shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      target={<RulesList onSearch={setSearchText} />}
    />
  );
  const addAliasAction = (
    <Action.Push
      title="Add Alias"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<RulesList onSearch={setSearchText} initialView="aliases" startAddingAlias />}
    />
  );
  const [sort, setSort] = useState("relevance");
  const abortable = useRef<AbortController>(null);
  const query = searchText.trim();
  const tab = useCurrentTab();

  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(
    async (text: string, order: string) => ({
      ...(await search(text, { limit, sort: order, signal: abortable.current?.signal })),
      text,
      order,
    }),
    [query, sort],
    { execute: query.length > 0, abortable, onError: () => undefined },
  );
  const { data: histerSearches } = useCachedPromise(getRecentSearches, [], { onError: () => undefined });
  const { data: local, revalidate: reloadLocal } = useCachedPromise(getLocalSearches, [], {
    onError: () => undefined,
  });
  const pinnedSearches = local?.pinned ?? [];
  const recentSearches = mergeRecentSearches([...(local?.recent ?? []), ...(histerSearches ?? [])]).filter(
    (recent) =>
      !pinnedSearches.includes(recent.query) && recent.searchedAt > (local?.hidden[recent.query] ?? -Infinity),
  );

  // A ref, because re-arming the timer on every render would keep it from ever firing.
  const reloadLocalRef = useRef(reloadLocal);
  reloadLocalRef.current = reloadLocal;
  // Saved once the text sits for 3 seconds, so half-typed searches aren't kept.
  useEffect(() => {
    if (!query) return;
    const timer = setTimeout(() => {
      saveRecentSearch(query).then(
        () => reloadLocalRef.current(),
        () => undefined,
      );
    }, 3000);
    return () => clearTimeout(timer);
  }, [query]);

  const updateLocal = async (update: Promise<void>) => {
    await update.catch(() => undefined);
    reloadLocal();
  };
  const clearRecentSearches = async () => {
    const confirmed = await confirmAlert({
      title: "Clear recent searches?",
      message: "They're only hidden in Raycast. Hister keeps its history.",
      primaryAction: { title: "Clear", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) await updateLocal(hideRecentSearches(recentSearches));
  };
  const currentTabAction = tab && (
    <Action
      title={`Search ${tab.host}`}
      icon={tab.favicon ?? Icon.Globe}
      onAction={() => setSearchText(`domain:${tab.host} `)}
    />
  );
  const mainActions = (
    <ActionPanel.Section>
      <Action.OpenInBrowser title="Open Hister" url={serverUrl()} shortcut={Keyboard.Shortcut.Common.Open} />
      <QueryDocsAction />
      {rulesAction}
      {addAliasAction}
    </ActionPanel.Section>
  );
  // Half-typed filters and open quotes ("domain:yeg") match nothing, so wait for typing to pause.
  const [pausedQuery, setPausedQuery] = useState(query);
  useEffect(() => {
    const timer = setTimeout(() => setPausedQuery(query), 1000);
    return () => clearTimeout(timer);
  }, [query]);
  // isLoading lags a render behind a new query, so also check what the data is for.
  const current = data?.text === query && data?.order === sort;
  const searching = Boolean(query) && (isLoading || !current || pausedQuery !== query);

  const results = query && !error && current ? data : undefined;
  const documentsByUrl = new Map(results?.documents.map((document) => [document.url, document]));
  const history: Result[] = (results?.history ?? []).map((entry: HistoryEntry) => ({
    url: entry.url,
    title: entry.title,
    documentId: entry.id,
    pinned: entry.pinned,
    document: documentsByUrl.get(entry.url),
  }));
  const historyUrls = new Set(history.map((result) => result.url));
  const documents: Result[] = (results?.documents ?? [])
    .filter((document) => !historyUrls.has(document.url))
    .map((document) => ({
      url: document.url,
      title: document.title,
      documentId: document.id,
      document,
    }));

  const favicon = useFavicons(results?.documents.map((document) => document.favicon_key) ?? []);

  const removeResult = async (result: Result) => {
    const confirmed = await confirmAlert({
      title: "Delete from Hister?",
      message: result.url,
      icon: Icon.Trash,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    const toast = await showToast({ style: Toast.Style.Animated, title: "Deleting" });
    try {
      await mutate(deleteDocument(result.url), {
        optimisticUpdate: (current) =>
          current && {
            ...current,
            documents: current.documents.filter((document) => document.url !== result.url),
            history: current.history.filter((entry) => entry.url !== result.url),
          },
      });
      toast.style = Toast.Style.Success;
      toast.title = "Deleted from Hister";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Could not delete";
      toast.message = error instanceof Error ? error.message : undefined;
    }
  };

  const renderItem = (result: Result) => (
    <List.Item
      key={result.documentId ?? result.url}
      icon={favicon(result.document?.favicon_key) ?? fallbackIcon(result.document)}
      title={result.title || result.url}
      accessories={result.pinned ? [{ icon: Icon.Tack, tooltip: "Pinned to this search in Hister" }] : []}
      detail={<ResultDetail result={result} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action
              title="Open in Browser"
              icon={Icon.Globe}
              onAction={async () => {
                const recorded = recordOpen(query, result.url, result.title).catch(() => undefined);
                await open(result.url);
                await closeMainWindow();
                await recorded;
              }}
            />
            <Action.Push
              title="Show Preview"
              icon={Icon.Eye}
              shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
              target={<PreviewDetail result={result} />}
            />
            <Action.OpenInBrowser
              title="Open Search in Hister"
              icon={Icon.MagnifyingGlass}
              url={webSearchUrl(query)}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy URL" content={result.url} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.CopyToClipboard
              title="Copy Markdown Link"
              content={`[${result.title || result.url}](${result.url})`}
              shortcut={Keyboard.Shortcut.Common.CopyName}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Page"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              shortcut={Keyboard.Shortcut.Common.Remove}
              onAction={() => removeResult(result)}
            />
            <Action.Push
              title="Disable Indexing…"
              icon={Icon.EyeDisabled}
              shortcut={Keyboard.Shortcut.Common.RemoveAll}
              target={<DisableIndexingForm url={result.url} onDone={revalidate} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <QueryDocsAction />
            {rulesAction}
            {addAliasAction}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={history.length + documents.length > 0}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search your history"
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Sort" storeValue onChange={setSort}>
          {sorts.map((option) => (
            <List.Dropdown.Item key={option.value} title={option.title} value={option.value} />
          ))}
        </List.Dropdown>
      }
    >
      {!query ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search Hister"
          description={'Try "an exact phrase", domain:github.com, or updated:<7d'}
          actions={
            <ActionPanel>
              {currentTabAction}
              {mainActions}
            </ActionPanel>
          }
        />
      ) : error && !isLoading ? (
        <List.EmptyView
          icon={Icon.Warning}
          title={error instanceof HisterError ? error.title : "Something went wrong"}
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : searching ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Searching…" />
      ) : results?.suggestion ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          description={`Did you mean "${results.suggestion}"?`}
          actions={
            <ActionPanel>
              <Action
                title={`Search for "${results.suggestion}"`}
                icon={Icon.MagnifyingGlass}
                onAction={() => setSearchText(results.suggestion ?? "")}
              />
              <QueryDocsAction />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No Results"
          actions={
            <ActionPanel>
              <QueryDocsAction />
            </ActionPanel>
          }
        />
      )}
      {!query && (
        <List.Section title="Pinned">
          {pinnedSearches.map((pinned) => (
            <List.Item
              key={pinned}
              icon={Icon.Tack}
              title={pinned}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(pinned)} />
                    {currentTabAction}
                  </ActionPanel.Section>
                  {mainActions}
                  <ActionPanel.Section>
                    <Action
                      title="Unpin Search"
                      icon={Icon.TackDisabled}
                      shortcut={Keyboard.Shortcut.Common.Pin}
                      onAction={() => updateLocal(togglePinnedSearch(pinned))}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {!query && (
        <List.Section title="Recent Searches">
          {recentSearches.map((recent) => (
            <List.Item
              key={recent.query}
              icon={Icon.Clock}
              title={recent.query}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action title="Search" icon={Icon.MagnifyingGlass} onAction={() => setSearchText(recent.query)} />
                    {currentTabAction}
                    <Action
                      title="Pin Search"
                      icon={Icon.Tack}
                      shortcut={Keyboard.Shortcut.Common.Pin}
                      onAction={() => updateLocal(togglePinnedSearch(recent.query))}
                    />
                  </ActionPanel.Section>
                  {mainActions}
                  <ActionPanel.Section>
                    <Action
                      title="Remove from Recent Searches"
                      icon={Icon.XMarkCircle}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.Remove}
                      onAction={() => updateLocal(hideRecentSearches([recent]))}
                    />
                    <Action
                      title="Clear Recent Searches"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      shortcut={Keyboard.Shortcut.Common.RemoveAll}
                      onAction={clearRecentSearches}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Opened Before">{history.map(renderItem)}</List.Section>
      <List.Section title="Results" subtitle={results ? results.total.toLocaleString() : undefined}>
        {documents.map(renderItem)}
      </List.Section>
    </List>
  );
}

function QueryDocsAction() {
  return (
    <Action.OpenInBrowser
      title="Open Query Syntax Docs"
      icon={Icon.Book}
      url={queryDocsUrl}
      shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
    />
  );
}

function ResultDetail({ result }: { result: Result }) {
  const { document } = result;
  const snippet = document?.text ? snippetMarkdown(document.text) : "";
  const updated = toDate(document?.updated);
  const added = toDate(document?.added);
  return (
    <List.Item.Detail
      markdown={`### ${result.title || result.url}\n\n${snippet}`}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="URL" text={result.url} target={result.url} />
          {document?.domain && <List.Item.Detail.Metadata.Label title="Domain" text={document.domain} />}
          {updated && <List.Item.Detail.Metadata.Label title="Last Visited" text={updated.toLocaleString()} />}
          {added && <List.Item.Detail.Metadata.Label title="First Indexed" text={added.toLocaleString()} />}
          {document?.add_count ? (
            <List.Item.Detail.Metadata.Label title="Visits" text={String(document.add_count)} />
          ) : null}
          {document?.label && (
            <List.Item.Detail.Metadata.TagList title="Label">
              <List.Item.Detail.Metadata.TagList.Item text={document.label} />
            </List.Item.Detail.Metadata.TagList>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function PreviewDetail({ result }: { result: Result }) {
  const { data, isLoading, error } = useCachedPromise(getPreview, [result.url, result.documentId], {
    onError: () => undefined,
  });
  const title = data?.title || result.title || result.url;
  const body = error ? error.message : data ? previewMarkdown(data) : "";
  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={title}
      markdown={`# ${title}\n\n${body}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={result.url} />
          <Action.CopyToClipboard title="Copy URL" content={result.url} shortcut={Keyboard.Shortcut.Common.Copy} />
        </ActionPanel>
      }
    />
  );
}
