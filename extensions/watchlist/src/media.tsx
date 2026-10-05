import { useEffect, useState, useCallback } from "react";
import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  Detail,
  Clipboard,
  openExtensionPreferences,
  showToast,
  Toast,
  open,
  confirmAlert,
  Alert,
  Keyboard,
} from "@raycast/api";
import {
  loadMedia,
  markUnwatched,
  removeItem,
  MediaItem,
  MediaKind,
  Section,
  createNote,
  getNotePath,
  getObsidianUrl,
  updateItem,
} from "./media-data";
import { clearDetailCache, detail, FullMeta } from "./cinemeta";
import AddMedia from "./add-media";
import Rate from "./rate";
import Edit from "./edit";

type ViewFilter = "all" | "watchlist" | "watched" | MediaKind;
type SortBy = "title" | "year" | "imdbRating" | "myRating" | "recent";

function matchesFilter(
  item: MediaItem,
  section: Section,
  filter: ViewFilter,
): boolean {
  return (
    filter === "all" ||
    (filter === "watchlist" && section === "Watchlist") ||
    (filter === "watched" && section === "Watched") ||
    filter === item.kind
  );
}

function descriptionFor(metadata: FullMeta): string {
  return [
    metadata.description,
    metadata.director ? `**Director:** ${metadata.director}` : "",
    metadata.cast ? `**Cast:** ${metadata.cast}` : "",
    metadata.runtime ? `**Runtime:** ${metadata.runtime}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

function metadataPatch(
  metadata: FullMeta,
  fallbackTitle: string,
): Partial<MediaItem> {
  return {
    title: metadata.name || fallbackTitle,
    year: metadata.year,
    poster: metadata.poster,
    director: metadata.director,
    genre: metadata.genres,
    imdbRating: metadata.imdbRating,
  };
}

function sortedItems(items: MediaItem[], sortBy: SortBy): MediaItem[] {
  if (sortBy === "recent") return [...items].reverse();
  return [...items].sort((a, b) => {
    if (sortBy === "title") return a.title.localeCompare(b.title);
    if (sortBy === "year") return b.year.localeCompare(a.year);
    const aRating =
      Number(sortBy === "myRating" ? a.myRating : a.imdbRating) || 0;
    const bRating =
      Number(sortBy === "myRating" ? b.myRating : b.imdbRating) || 0;
    return bRating - aRating || a.title.localeCompare(b.title);
  });
}

function ratingColor(v: string): Color {
  const n = Number(v);
  if (Number.isNaN(n)) return Color.SecondaryText;
  if (n >= 8) return Color.Green;
  if (n >= 6) return Color.Yellow;
  return Color.Orange;
}

function accessoriesFor(item: MediaItem) {
  const acc: List.Item.Accessory[] = [];
  if (item.myRating) {
    acc.push({
      tag: { value: `★ ${item.myRating}`, color: ratingColor(item.myRating) },
    });
  } else if (item.imdbRating) {
    acc.push({ text: `IMDb ${item.imdbRating}` });
  }
  acc.push({ tag: item.kind === "Series" ? "TV" : "Film" });
  return acc;
}

function markdownFor(item: MediaItem, extra?: string): string {
  const parts: string[] = [];
  if (item.poster) parts.push(`![poster](${item.poster})`);
  parts.push(`# ${item.title}`);
  const line = [item.year, item.kind, item.genre].filter(Boolean).join(" · ");
  if (line) parts.push(`*${line}*`);
  if (extra) parts.push("", extra);
  return parts.join("\n\n");
}

export default function Command() {
  const [watchlist, setWatchlist] = useState<MediaItem[]>([]);
  const [watched, setWatched] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<ViewFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("title");
  const [showDetail, setShowDetail] = useState(true);
  const [descs, setDescs] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    try {
      const d = loadMedia();
      setWatchlist(d.watchlist);
      setWatched(d.watched);
      setLoadError(null);
    } catch (e) {
      setLoadError(String(e instanceof Error ? e.message : e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Lazily pull descriptions for anything that has an IMDb id.
  useEffect(() => {
    const all = [...watchlist, ...watched].filter(
      (i) => i.imdbId && !(i.imdbId in descs),
    );
    if (all.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        all.slice(0, 20).map(async (i) => {
          const m = await detail(i.imdbId, i.kind);
          return [i.imdbId, m ? descriptionFor(m) : ""] as const;
        }),
      );
      if (!cancelled)
        setDescs((p) => ({ ...p, ...Object.fromEntries(entries) }));
    })();
    return () => {
      cancelled = true;
    };
  }, [watchlist, watched, descs]);

  const act = (fn: () => void, ok: string) => {
    try {
      fn();
      showToast({ style: Toast.Style.Success, title: ok });
      refresh();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed",
        message: String(e instanceof Error ? e.message : e),
      });
    }
  };

  const doRemove = async (item: MediaItem, from: Section) => {
    const ok = await confirmAlert({
      title: `Remove "${item.title}"?`,
      message: "This deletes the row from Movies.md.",
      primaryAction: { title: "Remove", style: Alert.ActionStyle.Destructive },
    });
    if (ok) act(() => removeItem(item.title, from), `Removed: ${item.title}`);
  };

  const openNote = () => open(getObsidianUrl() ?? getNotePath());

  const pickRandom = () => {
    const pool = watchlist.filter((item) =>
      matchesFilter(item, "Watchlist", viewFilter),
    );
    if (pool.length === 0) {
      showToast({ style: Toast.Style.Failure, title: "Watchlist is empty" });
      return;
    }
    const pick = pool[Math.floor(Math.random() * pool.length)];
    showToast({
      style: Toast.Style.Success,
      title: "Tonight:",
      message: pick.title,
    });
  };

  const refreshMetadata = async (item: MediaItem, section: Section) => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing metadata…",
    });
    try {
      if (!item.imdbId) throw new Error("This item has no IMDb link");
      await clearDetailCache(item.imdbId, item.kind);
      const metadata = await detail(item.imdbId, item.kind, { force: true });
      if (!metadata) throw new Error("No metadata found");
      updateItem(item.title, section, metadataPatch(metadata, item.title));
      setDescs((current) => ({
        ...current,
        [item.imdbId]: descriptionFor(metadata),
      }));
      toast.style = Toast.Style.Success;
      toast.title = `Refreshed: ${item.title}`;
      refresh();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't refresh metadata";
      toast.message = String(e instanceof Error ? e.message : e);
    }
  };

  const globalActions = (
    <>
      <Action.Push
        title="Add Movie or Series"
        icon={Icon.Plus}
        target={<AddMedia onAdded={refresh} />}
        shortcut={Keyboard.Shortcut.Common.New}
      />
      <Action
        title="Pick Something at Random"
        icon={Icon.Shuffle}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={pickRandom}
      />
      <Action
        title={showDetail ? "Hide Detail" : "Show Detail"}
        icon={Icon.Sidebar}
        shortcut={Keyboard.Shortcut.Common.ToggleQuickLook}
        onAction={() => setShowDetail((v) => !v)}
      />
      <ActionPanel.Submenu title="Sort by">
        <Action title="Recently Added" onAction={() => setSortBy("recent")} />
        <Action title="Title" onAction={() => setSortBy("title")} />
        <Action title="Year" onAction={() => setSortBy("year")} />
        <Action title="IMDb Rating" onAction={() => setSortBy("imdbRating")} />
        <Action title="Your Rating" onAction={() => setSortBy("myRating")} />
      </ActionPanel.Submenu>
      <Action
        title="Open in Obsidian"
        icon={Icon.Document}
        onAction={openNote}
      />
    </>
  );

  const row = (item: MediaItem, section: Section) => (
    <List.Item
      key={`${section}-${item.imdbId || item.title}`}
      icon={item.poster ? { source: item.poster } : Icon.FilmStrip}
      title={item.title}
      subtitle={
        showDetail
          ? undefined
          : [item.year, item.director].filter(Boolean).join(" · ")
      }
      accessories={showDetail ? undefined : accessoriesFor(item)}
      detail={
        <List.Item.Detail
          markdown={markdownFor(item, descs[item.imdbId])}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Type" text={item.kind} />
              {item.year ? (
                <List.Item.Detail.Metadata.Label
                  title="Year"
                  text={item.year}
                />
              ) : null}
              {item.director ? (
                <List.Item.Detail.Metadata.Label
                  title="Director"
                  text={item.director}
                />
              ) : null}
              {item.genre ? (
                <List.Item.Detail.Metadata.TagList title="Genre">
                  {item.genre.split(",").map((g) => (
                    <List.Item.Detail.Metadata.TagList.Item
                      key={g.trim()}
                      text={g.trim()}
                    />
                  ))}
                </List.Item.Detail.Metadata.TagList>
              ) : null}
              {item.imdbRating ? (
                <List.Item.Detail.Metadata.Label
                  title="IMDb"
                  text={`★ ${item.imdbRating}`}
                />
              ) : null}
              {item.myRating ? (
                <List.Item.Detail.Metadata.Label
                  title="Your Rating"
                  text={`★ ${item.myRating}`}
                />
              ) : null}
              {item.notes ? (
                <List.Item.Detail.Metadata.Label
                  title="Notes"
                  text={item.notes}
                />
              ) : null}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {section === "Watchlist" ? (
            <Action.Push
              title="Mark as Watched"
              icon={Icon.Checkmark}
              target={<Rate item={item} section="Watchlist" onDone={refresh} />}
            />
          ) : (
            <Action.Push
              title="Edit Rating and Notes"
              icon={Icon.Pencil}
              target={<Rate item={item} section="Watched" onDone={refresh} />}
            />
          )}
          {section === "Watched" && (
            <Action
              title="Move Back to Watchlist"
              icon={Icon.Circle}
              onAction={() =>
                act(
                  () => markUnwatched(item.title),
                  `Back on watchlist: ${item.title}`,
                )
              }
            />
          )}
          <Action.Push
            title="Edit Details"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<Edit item={item} section={section} onDone={refresh} />}
          />
          {item.imdbId && (
            <>
              <Action.OpenInBrowser
                title="Open on IMDb"
                url={`https://www.imdb.com/title/${item.imdbId}/`}
                shortcut={{ modifiers: ["cmd"], key: "i" }}
              />
              <Action
                title="Copy IMDb Link"
                icon={Icon.Link}
                onAction={() =>
                  Clipboard.copy(`https://www.imdb.com/title/${item.imdbId}/`)
                }
              />
              <Action
                title="Refresh Metadata"
                icon={Icon.Repeat}
                onAction={() => refreshMetadata(item, section)}
              />
            </>
          )}
          {globalActions}
          <Action
            title="Remove"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => doRemove(item, section)}
          />
        </ActionPanel>
      }
    />
  );

  if (loadError) {
    return (
      <Detail
        markdown={`# Watchlist setup required\n\n${loadError}\n\nChoose your Markdown file in the extension preferences, then retry. The file will be updated with Watchlist and Watched sections when needed.`}
        actions={
          <ActionPanel>
            <Action
              title="Open Extension Preferences"
              onAction={openExtensionPreferences}
            />
            <Action
              title="Create Watchlist File"
              icon={Icon.Plus}
              onAction={() => {
                try {
                  createNote();
                  refresh();
                  showToast({
                    style: Toast.Style.Success,
                    title: "Watchlist file ready",
                  });
                } catch (e) {
                  showToast({
                    style: Toast.Style.Failure,
                    title: "Couldn't create file",
                    message: String(e instanceof Error ? e.message : e),
                  });
                }
              }}
            />
          </ActionPanel>
        }
      />
    );
  }

  const visibleWatchlist = sortedItems(
    watchlist.filter((item) => matchesFilter(item, "Watchlist", viewFilter)),
    sortBy,
  );
  const visibleWatched = sortedItems(
    watched.filter((item) => matchesFilter(item, "Watched", viewFilter)),
    sortBy,
  );

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={
        showDetail && visibleWatchlist.length + visibleWatched.length > 0
      }
      searchBarPlaceholder="Filter your list…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter"
          value={viewFilter}
          onChange={(v) => setViewFilter(v as ViewFilter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Watchlist" value="watchlist" />
          <List.Dropdown.Item title="Watched" value="watched" />
          <List.Dropdown.Item title="Movies" value="Movie" />
          <List.Dropdown.Item title="Series" value="Series" />
        </List.Dropdown>
      }
    >
      <List.Section title="Watchlist" subtitle={`${visibleWatchlist.length}`}>
        {visibleWatchlist.map((i) => row(i, "Watchlist"))}
      </List.Section>
      <List.Section title="Watched" subtitle={`${visibleWatched.length}`}>
        {visibleWatched.map((i) => row(i, "Watched"))}
      </List.Section>
      <List.EmptyView
        icon={Icon.FilmStrip}
        title="Nothing here yet"
        description="Press ⌘N to search and add a movie or series"
        actions={<ActionPanel>{globalActions}</ActionPanel>}
      />
    </List>
  );
}
