import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  open,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useMemo, useState } from "react";
import { SiteForm } from "./components/site-form";
import { SiteList } from "./components/site-list";
import { clearCache } from "./lib/cache";
import { markOpened, readRecent } from "./lib/recent";
import { type DeckMatch, matchDeck } from "./lib/search";
import { SHORTCUTS } from "./lib/shortcuts";
import { INDEX_VERSION, loadIndex } from "./lib/slides";
import type { FolderIcon } from "./lib/parse";
import type { Deck } from "./lib/types";

const ALL = "all";

/** The dropdown holds one value, so a site and a folder pick share its space. */
type Filter = { kind: "all" } | { kind: "site"; id: string } | { kind: "folder"; siteId: string; name: string };

function parseFilter(value: string): Filter {
  if (value.startsWith("site:")) return { kind: "site", id: value.slice("site:".length) };
  if (value.startsWith("folder:")) {
    const rest = value.slice("folder:".length);
    const at = rest.indexOf(":");
    if (at !== -1) return { kind: "folder", siteId: rest.slice(0, at), name: rest.slice(at + 1) };
  }
  return { kind: "all" };
}

function matchesFilter(deck: Deck, filter: Filter): boolean {
  if (filter.kind === "all") return true;
  if (filter.kind === "site") return deck.site.id === filter.id;
  return deck.site.id === filter.siteId && deck.folder?.name === filter.name;
}

type SortKey = "recent" | "created" | "title";
type Hit = { deck: Deck; match: DeckMatch };
type Group = {
  key: string;
  siteId: string;
  /** null for the bucket holding decks their author never filed. */
  folder: string | null;
  title: string;
  hits: Hit[];
};

export default function SearchSlides() {
  const { push } = useNavigation();
  const { data, isLoading, revalidate } = useCachedPromise(loadIndex, [INDEX_VERSION], {
    keepPreviousData: true,
  });
  const { data: recent, revalidate: revalidateRecent } = useCachedPromise(readRecent);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("recent");
  const [showDetail, setShowDetail] = useState(false);

  const sites = data?.sites ?? [];
  const failures = data?.failures ?? [];
  const multipleSources = sites.length > 1;

  const filter = useMemo(() => parseFilter(selection), [selection]);

  // Every folder that actually holds a deck, in site order.
  const folderOptions = useMemo(() => {
    const seen = new Map<string, { siteId: string; siteLabel: string; name: string; icon: FolderIcon | null }>();
    for (const deck of data?.decks ?? []) {
      if (!deck.folder) continue;
      const key = `${deck.site.id}:${deck.folder.name}`;
      if (seen.has(key)) continue;
      seen.set(key, {
        siteId: deck.site.id,
        siteLabel: deck.site.label,
        name: deck.folder.name,
        icon: deck.folder.icon,
      });
    }
    return [...seen.values()];
  }, [data]);

  // A filter outlives what it points at: remove the site it names from Manage
  // Sites and every deck is filtered away. With one site left the dropdown
  // itself disappears, so there would be no way back to an unfiltered list.
  useEffect(() => {
    if (!data || filter.kind === "all") return;
    const exists =
      filter.kind === "site"
        ? sites.some((site) => site.id === filter.id)
        : folderOptions.some((folder) => folder.siteId === filter.siteId && folder.name === filter.name);
    if (!exists) setSelection(ALL);
  }, [data, sites, folderOptions, filter]);

  const groups = useMemo(() => {
    const opened = recent ?? {};
    const hits = (data?.decks ?? [])
      .filter((deck) => matchesFilter(deck, filter))
      .map((deck) => ({ deck, match: matchDeck(deck, query) }))
      .filter((entry): entry is Hit => entry.match !== null);

    // With a query the ranking is the answer; without one, the decks you reach
    // for most should be at the top.
    const order = (a: Hit, b: Hit) => {
      if (query) return b.match.score - a.match.score;
      if (sort === "title") return a.deck.title.localeCompare(b.deck.title);
      if (sort === "recent") {
        const diff = (opened[b.deck.key] ?? 0) - (opened[a.deck.key] ?? 0);
        if (diff !== 0) return diff;
      }
      return (b.deck.createdAt ?? 0) - (a.deck.createdAt ?? 0);
    };

    // Sections follow the author's own sidebar folders, falling back to the
    // site for decks that were never filed.
    const buckets = new Map<string, Group>();
    for (const hit of hits.sort(order)) {
      const { site, folder } = hit.deck;
      // Prefixed so a folder literally named "unfiled" cannot collide with the
      // bucket for decks that have no folder.
      const key = folder ? `${site.id}:folder:${folder.name}` : `${site.id}:unfiled`;
      const existing = buckets.get(key);
      if (existing) {
        existing.hits.push(hit);
        continue;
      }
      // Sections are per site, so the site belongs in the heading rather than
      // repeated on every row inside it.
      // Section titles are plain text, so only an emoji can ride along; a
      // colour folder shows its swatch in the filter dropdown instead.
      const folderTitle = folder
        ? [folder.icon?.kind === "emoji" ? folder.icon.value : null, folder.name].filter(Boolean).join(" ")
        : null;
      buckets.set(key, {
        key,
        siteId: site.id,
        folder: folder?.name ?? null,
        title: folderTitle ? (multipleSources ? `${site.label} / ${folderTitle}` : folderTitle) : site.label,
        hits: [hit],
      });
    }

    // Site order first, then folders in the order decks appear, unsorted last.
    return [...buckets.values()].sort((a, b) => {
      if (a.siteId !== b.siteId) {
        return sites.findIndex((s) => s.id === a.siteId) - sites.findIndex((s) => s.id === b.siteId);
      }
      if (a.folder === null) return 1;
      if (b.folder === null) return -1;
      return 0;
    });
  }, [data, sites, multipleSources, query, recent, sort, filter]);

  const viewActions = (
    <>
      <ActionPanel.Section title="View">
        <Action
          title={showDetail ? "Hide Details" : "Show Details"}
          icon={Icon.Sidebar}
          shortcut={SHORTCUTS.toggleDetail}
          onAction={() => setShowDetail((value) => !value)}
        />
        <ActionPanel.Submenu title="Sort by" icon={Icon.ArrowDown} shortcut={SHORTCUTS.sort}>
          <Action title="Recently Opened" icon={Icon.Clock} onAction={() => setSort("recent")} />
          <Action title="Newest" icon={Icon.Calendar} onAction={() => setSort("created")} />
          <Action title="Title" icon={Icon.Text} onAction={() => setSort("title")} />
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    </>
  );

  // With nothing added yet there is only one thing worth offering; the rest
  // would act on decks that do not exist.
  const addAction = (
    <Action
      title="Add Site"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      onAction={() => push(<SiteForm onAdded={revalidate} />)}
    />
  );

  const siteActions = (
    <ActionPanel.Section title="Sites">
      {addAction}
      <Action
        title="Manage Sites"
        icon={Icon.Globe}
        shortcut={SHORTCUTS.manage}
        onAction={() => push(<SiteList onChange={revalidate} />)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action
        title="Clear Cache and Rescan"
        icon={Icon.Trash}
        shortcut={SHORTCUTS.clearCache}
        onAction={() => {
          clearCache();
          revalidate();
          showToast({ style: Toast.Style.Success, title: "Cache cleared" });
        }}
      />
    </ActionPanel.Section>
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && groups.length > 0}
      filtering={false}
      onSearchTextChange={setQuery}
      throttle
      searchBarPlaceholder="Search slides by title, theme, or content..."
      searchBarAccessory={
        multipleSources || folderOptions.length > 0 ? (
          <List.Dropdown tooltip="Filter" value={selection} onChange={setSelection}>
            <List.Dropdown.Item title="All Slides" value={ALL} />
            {multipleSources ? (
              <List.Dropdown.Section title="Sites">
                {sites.map((site) => (
                  <List.Dropdown.Item key={site.id} icon={Icon.Globe} title={site.label} value={`site:${site.id}`} />
                ))}
              </List.Dropdown.Section>
            ) : null}
            {folderOptions.length > 0 ? (
              <List.Dropdown.Section title="Folders">
                {folderOptions.map((folder) => (
                  <List.Dropdown.Item
                    key={`${folder.siteId}:${folder.name}`}
                    // A colour folder gets the swatch open-slide shows it with;
                    // an emoji one carries its emoji in the title instead.
                    icon={
                      folder.icon?.kind === "color"
                        ? { source: "folder-swatch.svg", tintColor: folder.icon.value }
                        : undefined
                    }
                    title={[
                      folder.icon?.kind === "emoji" ? folder.icon.value : null,
                      folder.name,
                      multipleSources ? `- ${folder.siteLabel}` : null,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    value={`folder:${folder.siteId}:${folder.name}`}
                  />
                ))}
              </List.Dropdown.Section>
            ) : null}
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={sites.length === 0 ? Icon.Globe : Icon.MagnifyingGlass}
        title={sites.length === 0 ? "No Sites Yet" : "No Matching Slides"}
        description={
          sites.length === 0
            ? "Paste the URL of a deployed open-slide site to scan every slide on it"
            : "Try a different search, or refresh if the site was redeployed"
        }
        actions={<ActionPanel>{sites.length === 0 ? addAction : siteActions}</ActionPanel>}
      />

      {failures.map((failure) => (
        <List.Item
          key={failure.site.id}
          icon={{ source: Icon.Warning, tintColor: Color.Red }}
          title={failure.site.label}
          subtitle={failure.message}
          accessories={[{ text: "Failed to load" }]}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Site" url={failure.site.base} />
              <Action.CopyToClipboard title="Copy URL" content={failure.site.base} />
              {siteActions}
            </ActionPanel>
          }
        />
      ))}

      {groups.map((group) => (
        <List.Section key={group.key} title={group.title} subtitle={`${group.hits.length}`}>
          {group.hits.map(({ deck, match }) => (
            <DeckItem
              key={deck.key}
              deck={deck}
              match={match}
              onOpened={() => markOpened(deck.key).then(revalidateRecent)}
              viewActions={viewActions}
              siteActions={siteActions}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

type DeckItemProps = {
  deck: Deck;
  match: DeckMatch;
  onOpened: () => void;
  viewActions: React.ReactNode;
  siteActions: React.ReactNode;
};

function DeckItem({ deck, match, onOpened, viewActions, siteActions }: DeckItemProps) {
  // A page-level hit turns the deck into a destination: open it where the match
  // actually is, rather than at page one.
  const url = match.page ? `${deck.url}?p=${match.page}` : deck.url;
  const openTitle = match.page ? `Open Slide at Page ${match.page}` : "Open Slide";
  const noteCount = (deck.notes ?? []).filter(Boolean).length;

  const accessories: List.Item.Accessory[] = [];
  if (deck.theme) accessories.push({ tag: deck.theme });
  // The same grid open-slide uses for its own page overview - a deck is a set
  // of 16:9 canvases, which is neither a stack of layers nor a document.
  if (match.page) {
    accessories.push({
      icon: Icon.AppWindowGrid2x2,
      text: `p.${match.page}`,
      tooltip: match.excerpt ?? undefined,
    });
  } else if (deck.pageCount) {
    accessories.push({
      icon: Icon.AppWindowGrid2x2,
      text: `${deck.pageCount}`,
      tooltip: `${deck.pageCount} pages`,
    });
  }
  if (deck.createdAt) accessories.push({ date: new Date(deck.createdAt), tooltip: "Created" });

  return (
    <List.Item
      // lucide's presentation glyph - every row carries the same mark, so the
      // eye runs down the titles rather than a ragged column of artwork.
      icon={{ source: "presentation.svg", tintColor: Color.SecondaryText }}
      title={deck.title}
      // Content only earns a place on screen when it explains the match.
      subtitle={match.excerpt ?? undefined}
      accessories={accessories}
      detail={
        // No markdown: with both halves present Raycast splits the pane, and a
        // deck has nothing to put in the top one. Copy is recovered from a
        // minified bundle as ordered fragments, so rendering it as prose would
        // promise a fidelity it cannot keep - and everything we do know exactly
        // is structured, so all of it reads better as metadata.
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label
                title="Slide"
                text={deck.title}
                icon={{ source: "presentation.svg", tintColor: Color.SecondaryText }}
              />
              <List.Item.Detail.Metadata.Label title="Site" text={deck.site.label} icon={Icon.Globe} />
              {deck.folder ? (
                <List.Item.Detail.Metadata.Label
                  title="Folder"
                  icon={
                    deck.folder.icon?.kind === "color"
                      ? { source: "folder-swatch.svg", tintColor: deck.folder.icon.value }
                      : undefined
                  }
                  text={
                    deck.folder.icon?.kind === "emoji"
                      ? `${deck.folder.icon.value} ${deck.folder.name}`
                      : deck.folder.name
                  }
                />
              ) : null}
              {deck.theme ? (
                <List.Item.Detail.Metadata.TagList title="Theme">
                  <List.Item.Detail.Metadata.TagList.Item text={deck.theme} color={Color.Blue} />
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {deck.pageCount ? (
                <List.Item.Detail.Metadata.Label
                  title="Pages"
                  text={`${deck.pageCount}`}
                  icon={Icon.AppWindowGrid2x2}
                />
              ) : null}
              {noteCount > 0 ? (
                <List.Item.Detail.Metadata.Label
                  title="Speaker Notes"
                  text={`${noteCount} of ${deck.pageCount ?? noteCount} pages`}
                  icon={Icon.SpeechBubble}
                />
              ) : null}
              {deck.createdAt ? (
                <List.Item.Detail.Metadata.Label
                  title="Created"
                  text={new Date(deck.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                />
              ) : null}
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Link title="URL" target={url} text={url.replace(/^https?:\/\//, "")} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title={openTitle} icon={Icon.Window} url={url} onOpen={onOpened} />
          <Action
            title="Open Presenter View"
            icon={Icon.Monitor}
            shortcut={SHORTCUTS.presenter}
            onAction={async () => {
              // The presenter window only syncs with a deck window that is
              // already presenting: they pair over a BroadcastChannel that the
              // deck joins when it enters play mode. Opening the presenter alone
              // always lands on "Not linked", so open both, deck last so it
              // takes focus.
              onOpened();
              await open(deck.presenterUrl);
              await open(deck.url);
              await showHUD("Press F in the deck window to start presenting");
            }}
          />
          {deck.themeUrl ? (
            <Action.OpenInBrowser title={`Open Theme "${deck.theme}"`} icon={Icon.Brush} url={deck.themeUrl} />
          ) : null}
          <Action.CopyToClipboard title="Copy Slide URL" content={url} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.CreateQuicklink
            title="Create Quicklink"
            icon={Icon.Link}
            // A deck you reach for constantly belongs in Raycast's root search,
            // not behind this command - so the quicklink points at the deck
            // itself rather than whichever page the search happened to match.
            quicklink={{ name: deck.title, link: deck.url }}
          />
          {viewActions}
          {siteActions}
        </ActionPanel>
      }
    />
  );
}
