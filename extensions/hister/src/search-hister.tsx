import {
  Action,
  ActionPanel,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  Toast,
  closeMainWindow,
  getPreferenceValues,
  open,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  HisterDocument,
  HisterError,
  HisterHistoryItem,
  HisterSemanticHit,
  PAGE_SIZE,
  cachedFavicons,
  docIcon,
  downloadFavicon,
  docTypeLabel,
  escapeMarkdown,
  fallbackSearchUrl,
  fromUnix,
  plainSnippet,
  search,
  serverBaseUrl,
  snippetToMarkdown,
  updateHistory,
  webUiUrl,
} from "./hister";

// `query` is the search that produced the result. While a new search loads, the previous
// results stay on screen, and history actions must be recorded against their own query.
type ResultItem =
  | { kind: "history"; key: string; query: string; item: HisterHistoryItem }
  | { kind: "document"; key: string; query: string; doc: HisterDocument; total: number }
  | { kind: "semantic"; key: string; query: string; hit: HisterSemanticHit; doc: HisterDocument };

export default function Command(props: LaunchProps) {
  const { semantic } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");
  const [showDetail, setShowDetail] = useCachedState("show-detail", true);
  const abortable = useRef<AbortController>(null);
  const query = searchText.trim();

  const { data, isLoading, error, pagination, revalidate } = useCachedPromise(
    (text: string, withSemantic: boolean) =>
      async ({ page, cursor }: { page: number; cursor?: string }) => {
        const res = await search(text, { pageKey: cursor, semantic: withSemantic, signal: abortable.current?.signal });
        const items: ResultItem[] = [];
        if (page === 0) {
          for (const item of res.history ?? []) {
            items.push({ kind: "history", key: `history:${item.url}`, query: text, item });
          }
        }
        const documents = res.documents ?? [];
        for (const doc of documents) {
          items.push({ kind: "document", key: `doc:${doc.id || doc.url}`, query: text, doc, total: res.total });
        }
        if (page === 0) {
          for (const hit of res.semantic_hits ?? []) {
            // Hits without a document are already part of the keyword results.
            if (hit.document) {
              items.push({ kind: "semantic", key: `semantic:${hit.doc_id}`, query: text, hit, doc: hit.document });
            }
          }
        }
        return {
          data: items,
          hasMore: Boolean(res.page_key) && documents.length >= PAGE_SIZE,
          cursor: res.page_key,
        };
      },
    [query, Boolean(semantic)],
    {
      execute: query.length > 0,
      keepPreviousData: true,
      abortable,
      onError: (err) => {
        // Query syntax errors are shown in the empty view instead of a toast.
        if (err instanceof HisterError && err.kind === "query") return;
        showFailureToast(err, {
          title: err instanceof HisterError && err.kind === "auth" ? "Access denied" : "Hister search failed",
          primaryAction: {
            title: "Open Extension Preferences",
            onAction: () => openExtensionPreferences(),
          },
        });
      },
    },
  );

  const sections = useMemo(() => groupResults(query ? (data ?? []) : []), [data, query]);
  const hasResults = sections.history.length + sections.documents.length + sections.semantic.length > 0;
  const favicons = useFavicons([...sections.documents, ...sections.semantic]);

  const shared = {
    query,
    favicons,
    showDetail,
    toggleDetail: () => setShowDetail((value) => !value),
    revalidate,
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search pages and files indexed by Hister"
      throttle
      pagination={pagination}
      isShowingDetail={showDetail && hasResults && !error}
    >
      {!query ? (
        <List.EmptyView
          icon={{ source: "extension-icon.png" }}
          title="Search Hister"
          description="Type to search the pages and files in your Hister index."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Hister" url={webUiUrl()} />
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : error ? (
        <ErrorView error={error} query={query} revalidate={revalidate} />
      ) : (
        <>
          <List.EmptyView
            icon={Icon.MagnifyingGlass}
            title={isLoading ? "Searching Hister…" : "No matches in Hister"}
            description={isLoading ? undefined : `Press ↵ to search the web for "${query}".`}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Search the Web" icon={Icon.Globe} url={fallbackSearchUrl(query)} />
                <Action.OpenInBrowser
                  title="Open Query in Hister"
                  icon={Icon.AppWindow}
                  url={webUiUrl(query)}
                  shortcut={Keyboard.Shortcut.Common.Open}
                />
              </ActionPanel>
            }
          />
          <List.Section title="Opened Before" subtitle={countLabel(sections.history.length)}>
            {sections.history.map((entry) => (
              <ResultListItem key={entry.key} entry={entry} {...shared} />
            ))}
          </List.Section>
          <List.Section title="Results" subtitle={sections.total ? countLabel(sections.total) : undefined}>
            {sections.documents.map((entry) => (
              <ResultListItem key={entry.key} entry={entry} {...shared} />
            ))}
          </List.Section>
          <List.Section title="Similar Pages" subtitle={countLabel(sections.semantic.length)}>
            {sections.semantic.map((entry) => (
              <ResultListItem key={entry.key} entry={entry} {...shared} />
            ))}
          </List.Section>
        </>
      )}
    </List>
  );
}

function groupResults(items: ResultItem[]) {
  const seen = new Set<string>();
  const historyUrls = new Set<string>();
  const history: ResultItem[] = [];
  const documents: ResultItem[] = [];
  const semantic: ResultItem[] = [];
  let total = 0;

  for (const entry of items) {
    if (seen.has(entry.key)) continue;
    seen.add(entry.key);
    if (entry.kind === "history") {
      historyUrls.add(entry.item.url);
      history.push(entry);
    } else if (entry.kind === "document") {
      total = Math.max(total, entry.total);
      if (!historyUrls.has(entry.doc.url)) documents.push(entry);
    } else if (!historyUrls.has(entry.doc.url)) {
      semantic.push(entry);
    }
  }
  // Pinned entries first, then by how often they were opened.
  history.sort((a, b) => {
    if (a.kind !== "history" || b.kind !== "history") return 0;
    return Number(Boolean(b.item.pinned)) - Number(Boolean(a.item.pinned)) || (b.item.count ?? 0) - (a.item.count ?? 0);
  });
  return { history, documents, semantic, total };
}

const FAVICON_CONCURRENCY = 4;

// Downloads favicons for the results on screen, a few at a time. When the results change,
// downloads still running are cancelled and only icons still needed are fetched again.
function useFavicons(entries: ResultItem[]): Map<string, string> {
  const [paths, setPaths] = useState<Map<string, string>>(() => cachedFavicons());
  const pathsRef = useRef(paths);
  const failed = useRef(new Set<string>());
  const wanted = [
    ...new Set(
      entries
        .map((entry) => (entry.kind === "history" ? undefined : entry.doc.favicon_key))
        .filter((key): key is string => Boolean(key)),
    ),
  ].join(",");

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    const queue = wanted
      ? wanted.split(",").filter((key) => !pathsRef.current.has(key) && !failed.current.has(key))
      : [];
    if (queue.length === 0) return;
    const controller = new AbortController();

    async function worker() {
      for (let key = queue.shift(); key !== undefined && !controller.signal.aborted; key = queue.shift()) {
        const current = key;
        try {
          const path = await downloadFavicon(current, controller.signal);
          if (path) setPaths((previous) => new Map(previous).set(current, path));
          else failed.current.add(current);
        } catch {
          // Cancelled downloads are retried the next time the icon is needed.
          if (!controller.signal.aborted) failed.current.add(current);
        }
      }
    }

    for (let i = 0; i < Math.min(FAVICON_CONCURRENCY, queue.length); i++) void worker();
    return () => controller.abort();
  }, [wanted]);

  return paths;
}

function countLabel(n: number): string | undefined {
  if (!n) return undefined;
  return n === 1 ? "1 match" : `${n.toLocaleString()} matches`;
}

interface ItemProps {
  entry: ResultItem;
  query: string;
  favicons: Map<string, string>;
  showDetail: boolean;
  toggleDetail: () => void;
  revalidate: () => void;
}

function entryFields(entry: ResultItem, favicons: Map<string, string>) {
  if (entry.kind === "history") {
    const { item } = entry;
    return {
      url: item.url,
      title: cleanTitle(item.title) || item.url,
      domain: item.domain || hostOf(item.url),
      icon: item.pinned ? Icon.Pin : Icon.Clock,
      snippet: item.text,
      pinned: Boolean(item.pinned),
    };
  }
  const { doc } = entry;
  return {
    url: doc.url,
    title: cleanTitle(doc.title) || doc.url,
    domain: doc.domain || hostOf(doc.url),
    icon: docIcon(doc, doc.favicon_key ? favicons.get(doc.favicon_key) : undefined),
    snippet: entry.kind === "semantic" ? entry.hit.matched_chunk || doc.text : doc.text,
    pinned: false,
  };
}

function ResultListItem({ entry, query, favicons, showDetail, toggleDetail, revalidate }: ItemProps) {
  const fields = entryFields(entry, favicons);
  const { url, title, domain, icon, snippet, pinned } = fields;

  async function openResult() {
    await open(url);
    // Record the click like the web UI does, so Hister ranks it higher for this query next time.
    await Promise.race([updateHistory({ url, title, query: entry.query }).catch(() => undefined), delay(1500)]);
    await closeMainWindow({ clearRootSearch: true });
  }

  async function setPinned(pin: boolean) {
    const toast = await showToast({ style: Toast.Style.Animated, title: pin ? "Pinning…" : "Unpinning…" });
    try {
      await updateHistory({ url, title, query: entry.query, pin });
      toast.style = Toast.Style.Success;
      toast.title = pin ? `Pinned for "${entry.query}"` : "Unpinned";
      revalidate();
    } catch (err) {
      await showFailureToast(err, { title: pin ? "Couldn't pin result" : "Couldn't unpin result" });
    }
  }

  async function forget() {
    try {
      await updateHistory({ url, query: entry.query, delete: true });
      await showToast({ style: Toast.Style.Success, title: "Removed from opened history" });
      revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Couldn't remove entry" });
    }
  }

  return (
    <List.Item
      title={title}
      subtitle={showDetail ? undefined : domain}
      icon={icon}
      keywords={[domain]}
      accessories={showDetail ? undefined : accessoriesFor(entry)}
      detail={<ResultDetail entry={entry} title={title} snippet={snippet} domain={domain} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action title={isWebUrl(url) ? "Open in Browser" : "Open"} icon={Icon.Globe} onAction={openResult} />
            <Action.OpenInBrowser title="Search the Web" icon={Icon.MagnifyingGlass} url={fallbackSearchUrl(query)} />
            <Action.OpenInBrowser
              title="Open Query in Hister"
              icon={Icon.AppWindow}
              url={webUiUrl(query)}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
            <Action.CopyToClipboard
              title="Copy as Markdown Link"
              content={`[${title.replace(/[[\]]/g, "\\$&")}](${url})`}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "l" },
                Windows: { modifiers: ["ctrl", "shift"], key: "l" },
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title={showDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              shortcut={{
                macOS: { modifiers: ["cmd", "shift"], key: "d" },
                Windows: { modifiers: ["ctrl", "shift"], key: "d" },
              }}
              onAction={toggleDetail}
            />
            <Action
              title={pinned ? "Unpin for This Query" : "Pin for This Query"}
              icon={pinned ? Icon.PinDisabled : Icon.Pin}
              shortcut={Keyboard.Shortcut.Common.Pin}
              onAction={() => setPinned(!pinned)}
            />
            {entry.kind === "history" && (
              <Action
                title="Remove from Opened History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={forget}
              />
            )}
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={revalidate}
            />
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function accessoriesFor(entry: ResultItem): List.Item.Accessory[] {
  if (entry.kind === "history") {
    const count = entry.item.count ?? 0;
    return count > 0 ? [{ text: `${count}×`, tooltip: `Opened ${count} times for this query` }] : [];
  }
  if (entry.kind === "semantic") {
    return [{ tag: `${Math.round(entry.hit.similarity * 100)}%`, tooltip: "Semantic similarity" }];
  }
  const updated = fromUnix(entry.doc.updated);
  return updated ? [{ date: updated, tooltip: `Updated ${updated.toLocaleString()}` }] : [];
}

function ResultDetail({
  entry,
  title,
  snippet,
  domain,
}: {
  entry: ResultItem;
  title: string;
  snippet?: string;
  domain: string;
}) {
  const body = entry.kind === "semantic" ? escapeMarkdown(plainSnippet(snippet)) : snippetToMarkdown(snippet);
  const markdown = `### ${escapeMarkdown(title)}\n\n${body || "_No snippet for this result._"}`;
  const url = entry.kind === "history" ? entry.item.url : entry.doc.url;

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Link title="URL" text={domain || url} target={url} />
          {entry.kind === "history" ? (
            <>
              <List.Item.Detail.Metadata.Label title="Opened for This Query" text={`${entry.item.count ?? 0} times`} />
              {entry.item.pinned && <List.Item.Detail.Metadata.Label title="Pinned" icon={Icon.Pin} text="Yes" />}
              <DateLabel title="Last Opened" seconds={entry.item.updated} />
            </>
          ) : (
            <>
              <List.Item.Detail.Metadata.Label title="Type" text={docTypeLabel(entry.doc.type)} />
              {entry.kind === "semantic" && (
                <List.Item.Detail.Metadata.Label
                  title="Similarity"
                  text={`${Math.round(entry.hit.similarity * 100)}%`}
                />
              )}
              <DateLabel title="Indexed" seconds={entry.doc.added} />
              {entry.doc.updated && entry.doc.updated !== entry.doc.added ? (
                <DateLabel title="Updated" seconds={entry.doc.updated} />
              ) : null}
              {entry.doc.language ? (
                <List.Item.Detail.Metadata.Label title="Language" text={entry.doc.language} />
              ) : null}
              {entry.doc.label ? <List.Item.Detail.Metadata.Label title="Label" text={entry.doc.label} /> : null}
            </>
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function DateLabel({ title, seconds }: { title: string; seconds?: number }) {
  const date = fromUnix(seconds);
  if (!date) return null;
  return (
    <List.Item.Detail.Metadata.Label
      title={title}
      text={date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
    />
  );
}

function ErrorView({ error, query, revalidate }: { error: Error; query: string; revalidate: () => void }) {
  const kind = error instanceof HisterError ? error.kind : undefined;
  const title =
    kind === "query"
      ? "Hister couldn't parse this query"
      : kind === "auth"
        ? "Hister rejected the access token"
        : kind === "unreachable"
          ? "Hister is not reachable"
          : "Hister search failed";
  const description =
    kind === "query"
      ? error.message
      : kind === "auth"
        ? "Set the token from `hister user show USERNAME --show-token` (or app.access_token) in the extension preferences."
        : kind === "unreachable"
          ? `Nothing answered at ${serverBaseUrl()}. Check that the server is running and the URL in the preferences.`
          : error.message;

  return (
    <List.EmptyView
      icon={kind === "query" ? Icon.QuestionMarkCircle : Icon.Warning}
      title={title}
      description={description}
      actions={
        <ActionPanel>
          {kind === "query" ? (
            <Action.OpenInBrowser title="Search the Web" icon={Icon.Globe} url={fallbackSearchUrl(query)} />
          ) : (
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          )}
          <Action
            title="Try Again"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
          <Action.OpenInBrowser title="Open Query in Hister" icon={Icon.AppWindow} url={webUiUrl(query)} />
        </ActionPanel>
      }
    />
  );
}

// Some pages have line breaks or runs of spaces in their <title>.
function cleanTitle(title?: string): string {
  return (title ?? "").replace(/\s+/g, " ").trim();
}

function hostOf(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function isWebUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
