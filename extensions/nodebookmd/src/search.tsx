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
} from "@raycast/api";
import { showFailureToast, useFetch, usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { combine, MIN_BODY_QUERY, rankBodies } from "./combine";
import { clearHistory, forgetPage, recentPages, rememberPage } from "./history";
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
  const titleList = useFetch<Hit[]>(`${baseUrl}/api/titles`, { execute: Boolean(baseUrl) });
  // ponytail: the server has no scope filter, so a scoped body search asks for more hits and filters here.
  const bodyLimit = scope ? 120 : 18;
  const searchesBodies = Boolean(baseUrl) && !scope?.history && words.length >= MIN_BODY_QUERY;
  const bodySearch = useFetch<Hit[]>(`${baseUrl}/api/search?query=${encodeURIComponent(words)}&limit=${bodyLimit}`, {
    execute: searchesBodies,
    keepPreviousData: true,
  });
  const scopedTitles = useMemo(
    () => (titleList.data ?? []).filter((hit) => inScope(scope, hit.path)),
    [titleList.data, scope],
  );
  const bodies = searchesBodies ? (bodySearch.data ?? []).filter((hit) => inScope(scope, hit.path)) : [];

  // Nothing typed, or `h:` alone: the pages opened before. `h:` with words searches only them.
  const showsHistory = !words || scope?.history;
  const hits = !showsHistory
    ? combine(scopedTitles, rankBodies(bodies, 6), words, 30)
    : words
      ? match(recent, words, 30)
      : recent;

  const actions = {
    remember: (hit: Hit) => rememberPage(hit).then(() => history.revalidate()),
    forget: showsHistory ? (hit: Hit) => forgetPage(hit.path).then(() => history.revalidate()) : undefined,
    clear: recent.length > 0 ? () => confirmClear().then(() => history.revalidate()) : undefined,
  };
  const failure = server.error ?? titleList.error ?? (searchesBodies ? bodySearch.error : undefined);
  const retry = () => (server.error ? server.revalidate() : (titleList.revalidate(), bodySearch.revalidate()));

  return (
    <List
      isLoading={server.isLoading || history.isLoading || titleList.isLoading || bodySearch.isLoading}
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
          description="sop:, lop:, v:, py: keep the search to one part. h: searches the pages you opened."
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
      // Some icons the index names are not in the install. The fallback keeps the row from looking empty.
      icon={hit.icon ? { source: `${baseUrl}/hicon/${hit.icon}`, fallback: Icon.Document } : Icon.Document}
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
