import {
  Action,
  ActionPanel,
  Alert,
  Clipboard,
  confirmAlert,
  Icon,
  Keyboard,
  LaunchProps,
  List,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast, useFetch, usePromise } from "@raycast/utils";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { useEffect, useMemo, useState } from "react";
import { BODY_SEARCH_DELAY, combine, MIN_BODY_QUERY, rankBodies } from "./combine";
import { cacheIcons, iconFile } from "./icons";
import { clearHistory, forgetPage, recentPages, rememberPage, save } from "./history";
import { match } from "./ranking";
import { inScope, parseScope } from "./scopes";
import { nodebookServer } from "./server";
import type { Hit } from "./types";

export default function SearchHoudiniDocs(props: LaunchProps<{ arguments: Arguments.Search }>) {
  // `hd box` in the root search, or a fallback search, starts with words already typed.
  const [query, setQuery] = useState(props.arguments.query || props.fallbackText || "");
  const { scope, words: typedWords } = parseScope(query);
  const words = typedWords.trim();
  const server = usePromise(nodebookServer);
  const baseUrl = server.data;
  const history = usePromise(recentPages);
  const recent = history.data ?? [];

  // Two searches, as in the app: every title once, matched in memory on each key,
  // and the body search for words of three letters or more.
  // Only the fields a row needs: the full list is twice the size, and Raycast caches what it keeps.
  const titleList = useFetch(`${baseUrl}/api/titles`, {
    execute: Boolean(baseUrl),
    parseResponse: async (response): Promise<Hit[]> =>
      ((await response.json()) as Hit[]).map(({ path, title, nodeType, icon }) => ({ path, title, nodeType, icon })),
  });
  // The body search waits for a pause in typing, as the app does, so each key does not queue a request.
  const [bodyWords, setBodyWords] = useState(words);
  useEffect(() => {
    const timer = setTimeout(() => setBodyWords(words), BODY_SEARCH_DELAY);
    return () => clearTimeout(timer);
  }, [words]);
  // ponytail: the server has no scope filter, so a scoped body search asks for more hits and filters here.
  const bodyLimit = scope ? 120 : 18;
  const searchesBodies = Boolean(baseUrl) && !scope?.history && bodyWords.length >= MIN_BODY_QUERY;
  const bodySearch = useFetch<Hit[]>(
    `${baseUrl}/api/search?query=${encodeURIComponent(bodyWords)}&limit=${bodyLimit}`,
    {
      execute: searchesBodies,
      keepPreviousData: true,
    },
  );
  const scopedTitles = useMemo(
    () => (titleList.data ?? []).filter((hit) => inScope(scope, hit.path)),
    [titleList.data, scope],
  );
  const bodies =
    searchesBodies && words.length >= MIN_BODY_QUERY
      ? (bodySearch.data ?? []).filter((hit) => inScope(scope, hit.path))
      : [];

  // Nothing typed, or `h:` alone: the pages opened before. `h:` with words searches only them.
  const showsHistory = !words || scope?.history;
  const hits = !showsHistory
    ? combine(scopedTitles, rankBodies(bodies, 6), words, 30)
    : words
      ? match(recent, words, 30)
      : recent;

  const [, setIconsSaved] = useState(0);
  const shownIcons = hits.flatMap((hit) => (hit.icon ? [hit.icon] : [])).join("|");
  useEffect(() => {
    if (!baseUrl || !shownIcons) return;
    cacheIcons(baseUrl, shownIcons.split("|")).then((added) => added && setIconsSaved((count) => count + 1));
  }, [baseUrl, shownIcons]);

  const actions = {
    remember: (hit: Hit) => rememberPage(hit).then(() => history.revalidate()),
    forget: showsHistory ? (hit: Hit) => removeWithUndo(hit, history.revalidate) : undefined,
    clear: recent.length > 0 ? () => confirmClear().then(() => history.revalidate()) : undefined,
  };
  const failure = server.error ?? titleList.error ?? (searchesBodies ? bodySearch.error : undefined);
  const retry = () => (server.error ? server.revalidate() : (titleList.revalidate(), bodySearch.revalidate()));

  return (
    <List
      isLoading={server.isLoading || history.isLoading || titleList.isLoading}
      isShowingDetail={hits.length > 0}
      searchText={query}
      onSearchTextChange={setQuery}
      // Raycast keeps the row that was selected before a key, so a fast typist lands on an old hit.
      selectedItemId={hits[0]?.path}
      searchBarPlaceholder="Search Houdini docs, v:point for VEX only, h: for history"
    >
      {failure ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="NodebookMD is not reachable"
          description={failure.message}
          actions={
            <ActionPanel>
              <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={retry} />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon="extension-icon.png"
          title="Search the Houdini docs"
          description="Use sop:, lop:, or vex: to filter the search to a specific context. Use h: to search the pages you opened previously."
        />
      )}
      {baseUrl && (
        <List.Section title={showsHistory ? "Recent" : undefined}>
          {hits.map((hit) => (
            <HitItem key={hit.path} hit={hit} baseUrl={baseUrl} {...actions} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

type HitActions = {
  remember: (hit: Hit) => Promise<unknown>;
  forget?: (hit: Hit) => Promise<unknown>;
  clear?: () => Promise<unknown>;
};

function HitItem({ hit, baseUrl, remember, forget, clear }: { hit: Hit; baseUrl: string } & HitActions) {
  const markdownUrl = `${baseUrl}/${hit.path}.md`;
  return (
    <List.Item
      id={hit.path}
      title={hit.title}
      subtitle={hit.nodeType ?? undefined}
      icon={rowIcon(hit, baseUrl)}
      detail={<PageDetail markdownUrl={markdownUrl} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {/* The app reads the slug as a SideFX address, so it starts with `houdini/`. */}
            <Action.Open
              title="Open in NodebookMD"
              target={`nodebookmd://docs/houdini/${hit.path}`}
              icon={Icon.Book}
              shortcut={Keyboard.Shortcut.Common.Open}
              onOpen={() => remember(hit)}
            />
            <Action
              title="Copy as Markdown"
              icon={Icon.Clipboard}
              shortcut={Keyboard.Shortcut.Common.Copy}
              onAction={() => copyPage(markdownUrl).then((copied) => copied && remember(hit))}
            />
            <Action.OpenInBrowser
              title="Open on SideFX"
              url={`https://www.sidefx.com/docs/houdini/${hit.path}.html`}
              shortcut={Keyboard.Shortcut.Common.OpenWith}
              onOpen={() => remember(hit)}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {forget && (
              <Action
                title="Remove from History"
                icon={Icon.XMarkCircle}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.Remove}
                onAction={() => forget(hit)}
              />
            )}
            {clear && (
              <Action
                title="Clear History"
                icon={Icon.Trash}
                style={Action.Style.Destructive}
                shortcut={Keyboard.Shortcut.Common.RemoveAll}
                onAction={clear}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

/** The icon from disk once it is cached, from the server until then. Raycast for Windows
    draws a local file only from a `file://` address. Some icons the index
    names are not in the install, so the fallback keeps the row from looking empty. */
function rowIcon(hit: Hit, baseUrl: string) {
  if (!hit.icon) return Icon.Document;
  const file = iconFile(hit.icon);
  return existsSync(file)
    ? { source: process.platform === "win32" ? pathToFileURL(file).href : file, fallback: Icon.Document }
    : { source: `${baseUrl}/hicon/${hit.icon}`, fallback: Icon.Document };
}

/** Copies the page, and says whether it did: a failed fetch leaves the clipboard alone. */
async function copyPage(markdownUrl: string): Promise<boolean> {
  try {
    const response = await fetch(markdownUrl);
    if (!response.ok) throw new Error(`NodebookMD answered ${response.status}`);
    await Clipboard.copy(await response.text());
    await showHUD("Copied page as Markdown");
    return true;
  } catch (error) {
    await showFailureToast(error, { title: "Could not copy the page" });
    return false;
  }
}

/** Removes a page from the history, with Undo on the toast in place of a confirmation. */
async function removeWithUndo(hit: Hit, refresh: () => Promise<unknown>) {
  const before = await recentPages();
  await forgetPage(hit.path);
  await refresh();
  await showToast({
    style: Toast.Style.Success,
    title: `Removed ${hit.title} from History`,
    primaryAction: { title: "Undo", onAction: () => save(before).then(refresh) },
  });
}

async function confirmClear() {
  const confirmed = await confirmAlert({
    title: "Clear History?",
    message: "This removes every page from the list of pages you opened.",
    primaryAction: { title: "Clear History", style: Alert.ActionStyle.Destructive },
  });
  if (confirmed) await clearHistory();
}

/** The page without its YAML front matter, so the preview starts at the title.
    Raycast does not draw `> [!TIP]` callouts, so the marker becomes a bold label. */
function forPreview(markdown: string): string {
  return markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "")
    .replace(/^> \[!(\w+)\]/gm, (_marker, kind: string) => `> **${kind[0]}${kind.slice(1).toLowerCase()}**`);
}

function PageDetail({ markdownUrl }: { markdownUrl: string }) {
  const page = useFetch(markdownUrl, { parseResponse: (response) => response.text() });
  return <List.Item.Detail isLoading={page.isLoading} markdown={forPreview(page.data ?? "")} />;
}
