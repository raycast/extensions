import { useEffect, useState, useRef } from "react";
import {
  Action,
  ActionPanel,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { searchAll, detail, SearchHit } from "./cinemeta";
import { addItem, emptyItem, exists, MediaKind, Section } from "./media-data";

interface Props {
  onAdded?: () => void;
}

export default function AddMedia({ onAdded }: Props) {
  const { pop } = useNavigation();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | MediaKind>("all");
  const seq = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setIsLoading(false);
      return;
    }
    const mine = ++seq.current;
    setIsLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchAll(q);
        if (seq.current === mine) setHits(res);
      } catch (e) {
        if (seq.current === mine) {
          showToast({
            style: Toast.Style.Failure,
            title: "Search failed",
            message: String(e instanceof Error ? e.message : e),
          });
        }
      } finally {
        if (seq.current === mine) setIsLoading(false);
      }
    }, 320);
    return () => clearTimeout(t);
  }, [query]);

  async function choose(hit: SearchHit, section: Section) {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Fetching details…",
    });
    try {
      if (exists(hit.name, hit.imdbId)) {
        toast.style = Toast.Style.Failure;
        toast.title = `Already listed: ${hit.name}`;
        return;
      }
      const full = await detail(hit.imdbId, hit.kind);
      addItem(
        {
          ...emptyItem(),
          title: full?.name || hit.name,
          imdbId: hit.imdbId,
          kind: hit.kind,
          year: full?.year || hit.year,
          poster: full?.poster || hit.poster,
          director: full?.director || "",
          genre: full?.genres || hit.genres,
          imdbRating: full?.imdbRating || hit.imdbRating,
        },
        section,
      );
      toast.style = Toast.Style.Success;
      toast.title = `Added to ${section}: ${full?.name || hit.name}`;
      onAdded?.();
      pop();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Couldn't add";
      toast.message = String(e instanceof Error ? e.message : e);
    }
  }

  function addManually(section: Section) {
    const title = query.trim();
    if (!title) return;
    try {
      addItem({ ...emptyItem(), title, kind: "Movie" }, section);
      showToast({
        style: Toast.Style.Success,
        title: `Added to ${section}: ${title}`,
      });
      onAdded?.();
      pop();
    } catch (e) {
      showToast({
        style: Toast.Style.Failure,
        title: "Couldn't add",
        message: String(e instanceof Error ? e.message : e),
      });
    }
  }

  const shown = hits.filter(
    (h) => kindFilter === "all" || h.kind === kindFilter,
  );
  const movies = shown.filter((h) => h.kind === "Movie");
  const series = shown.filter((h) => h.kind === "Series");

  const renderHit = (hit: SearchHit) => (
    <List.Item
      key={`${hit.kind}-${hit.imdbId}`}
      icon={hit.poster ? { source: hit.poster } : Icon.FilmStrip}
      title={hit.name}
      subtitle={[hit.year, hit.genres].filter(Boolean).join(" · ")}
      accessories={[
        ...(hit.imdbRating ? [{ text: `★ ${hit.imdbRating}` }] : []),
        { tag: hit.kind },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="Add to Watchlist"
            icon={Icon.Plus}
            onAction={() => choose(hit, "Watchlist")}
          />
          <Action
            title="Add as Already Watched"
            icon={Icon.Checkmark}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={() => choose(hit, "Watched")}
          />
          <Action.OpenInBrowser
            title="Open on IMDb"
            url={`https://www.imdb.com/title/${hit.imdbId}/`}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
          />
        </ActionPanel>
      }
    />
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search a movie or series…"
      onSearchTextChange={setQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Type"
          onChange={(v) => setKindFilter(v as "all" | MediaKind)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="Movies" value="Movie" />
          <List.Dropdown.Item title="Series" value="Series" />
        </List.Dropdown>
      }
    >
      {movies.length > 0 && (
        <List.Section title="Movies" subtitle={`${movies.length}`}>
          {movies.map(renderHit)}
        </List.Section>
      )}
      {series.length > 0 && (
        <List.Section title="Series" subtitle={`${series.length}`}>
          {series.map(renderHit)}
        </List.Section>
      )}
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={
          query.trim().length < 2
            ? "Type to search"
            : isLoading
              ? "Searching…"
              : "No matches"
        }
        description={
          query.trim().length < 2
            ? "Results come from Cinemeta — free, no account needed"
            : "You can still add it by hand"
        }
        actions={
          query.trim().length >= 2 && !isLoading ? (
            <ActionPanel>
              <Action
                title={`Add "${query.trim()}" Manually`}
                icon={Icon.Plus}
                onAction={() => addManually("Watchlist")}
              />
            </ActionPanel>
          ) : undefined
        }
      />
    </List>
  );
}
