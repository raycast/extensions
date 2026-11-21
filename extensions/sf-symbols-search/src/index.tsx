import { countOf, showError } from "@chrismessina/raycast-kit";
import {
  Action,
  ActionPanel,
  Color,
  Detail,
  environment,
  getPreferenceValues,
  Grid,
  Icon,
  Image,
  Keyboard,
  LaunchProps,
  List,
  Toast,
} from "@raycast/api";
import { pathToFileURL } from "node:url";
import { useCachedState, usePromise } from "@raycast/utils";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { familyMembers, loadCatalog } from "./catalog";
import {
  ALL_FORMATS,
  ALL_SIZES,
  ALL_WEIGHTS,
  capitalize,
  copyImageWithToast,
  ExportFormat,
  exportWithToast,
  getExportSettings,
  getFormatLabel,
  getWeightLabel,
} from "./export";
import { canUseAI, searchSymbols, suggestKeywords, symbolsForKeywords } from "./search";
import { findSFSymbolsApp, SFSymbolsApp } from "./sfsymbols-cli";
import {
  addRecentSymbol,
  getPinnedSymbols,
  getRecentSymbols,
  isPinnedSymbol,
  SaveActions,
  usePinned,
  usePinRevision,
} from "./storage";
import { previewPath, previewStripMarkdown, prunePreviews, renderCategoryIcons, renderPreviews } from "./preview";
import {
  isTinted,
  listTiles,
  renderMissingTiles,
  textColor,
  TILE_MODES,
  TileMode,
  TileStyle,
  tilePath,
  tileSetKey,
} from "./tiles";
import { CatalogIndex, Platform, PLATFORMS, sfsymbol, SymbolProps } from "./types";

const { primaryAction, gridColumns, showName, minimumVersionOS, showRecent, aiSearch } =
  getPreferenceValues<ExtensionPreferences>();

/** Resolved once per launch: whether SF Symbols 27.2+ (and its CLI) is installed. */
const app = findSFSymbolsApp();

/** How long typing must pause before a search asks Raycast AI. */
const AI_DEBOUNCE_MS = 700;
/** How long the list selection rests on a row before the sidebar card is rendered for it. */
const CARD_DEBOUNCE_MS = 60;
/** A plain search with fewer results than this also gets AI suggestions, even for one word. */
const AI_THIN_RESULTS = 8;
const MAX_AI_TILES = 80;

/**
 * The formats a one-off size or weight export uses. The SVG template carries every size and weight
 * in one file, so it can't honor one; it's dropped, falling back to PNG if it was the only format.
 * Preferences are fixed for a launch, so this is worked out once rather than for every symbol.
 */
const sizedFormats: readonly ExportFormat[] = (() => {
  const rendered = getExportSettings().formats.filter((format) => format !== "svg");
  return rendered.length > 0 ? rendered : ["png"];
})();

function getImageURL(name: string) {
  return `https://raw.githubusercontent.com/ndckj/sf-symbols/main/images/100/${name}.png`;
}

/** Locally rendered tiles of one style. */
type TileSet = {
  /** The set's folder key; see `tileSetKey`. */
  key: string;
  /** Whether the grid tints these tiles (monochrome) or shows their own colors. */
  tinted: boolean;
  /** Symbols with a rendered tile in this set. Anything else uses the downloaded image. */
  names: ReadonlySet<string>;
  /** Colored modes only: the same style for the other appearance, which Raycast swaps in by itself. */
  other?: { key: string; names: ReadonlySet<string> };
};

type ViewMode = "grid" | "list";

/** The grid sizes the Grid Size preference offers, as column counts. */
const GRID_SIZES = [
  { title: "Small", columns: "8" },
  { title: "Medium", columns: "5" },
] as const;

/** Everything a tile needs that isn't the symbol itself. */
type ViewContext = {
  catalog: CatalogIndex;
  tiles: TileSet;
  refresh: () => void;
  grouped: boolean;
  setGrouped: (grouped: boolean) => void;
  /** The tile style on screen (the Multicolor category keeps its own mode). */
  style: TileStyle;
  setStyle: (style: TileStyle) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  /** Grid columns, as the preference stores them. */
  columns: string;
  setColumns: (columns: string) => void;
  /** Whether the list shows its metadata sidebar. */
  showingDetail: boolean;
  setShowingDetail: (showing: boolean) => void;
  /** How the list orders its results. */
  sort: ListSort;
  setSort: (sort: ListSort) => void;
  /** The category being shown, so rows don't badge what every row in it shares. */
  category?: string;
};

type ListSort = "default" | "name" | "category";

const LIST_SORTS: readonly { value: ListSort; title: string }[] = [
  { value: "default", title: "SF Symbols Order" },
  { value: "name", title: "Name" },
  { value: "category", title: "Category" },
];

/** Categories that describe a feature rather than a subject, so they don't decide where a symbol is filed. */
const FEATURE_CATEGORIES = new Set(["all", "whatsnew", "draw", "variable", "multicolor"]);

function byName<T extends { symbol: sfsymbol }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.symbol.name.localeCompare(b.symbol.name));
}

/**
 * The results as one section per category, in the SF Symbols sidebar's order. Each symbol is filed
 * once, under its first subject category, so the list doesn't repeat symbols.
 */
function categorySections(entries: readonly Entry[], catalog: CatalogIndex, keySuffix: string): SectionModel[] {
  const byCategory = new Map<string, Entry[]>();
  for (const entry of entries) {
    const home = entry.symbol.categories.find((name) => !FEATURE_CATEGORIES.has(name)) ?? "";
    const filed = byCategory.get(home);
    if (filed) filed.push(entry);
    else byCategory.set(home, [entry]);
  }
  const order = [...catalog.categories.map((entry) => entry.name), ""];
  const titles = new Map(catalog.categories.map((entry) => [entry.name, entry.title]));
  return order
    .filter((name) => byCategory.has(name))
    .map((name) => {
      const filed = byCategory.get(name) ?? [];
      return {
        id: `category-${name || "other"}`,
        key: `category-${name || "other"}-${keySuffix}`,
        title: name ? (titles.get(name) ?? name) : "Other",
        subtitle: countOf(filed.length, "symbol"),
        entries: filed,
      };
    });
}

/** One symbol in a section, with what its tile needs to know about where it is. */
type Entry = { symbol: sfsymbol; familySize?: number; pinned?: boolean; recent?: boolean };

type SectionModel = {
  id: string;
  /** Overrides the React key, to make Raycast lay a section out afresh. */
  key?: string;
  title?: string;
  subtitle?: string;
  entries: Entry[];
};

/**
 * Badges on rows sit a step lighter than secondary text, which Raycast draws nearly as dark as the
 * title in light mode, so they don't compete with the symbol.
 */
const BADGE_COLOR: Color.Dynamic = { light: "#A3A3A3", dark: "#7A7A7A", adjustContrast: false };

/** The SF Symbols info badge. */
const RESTRICTION_ICON: Image.ImageLike = { source: Icon.Info, tintColor: BADGE_COLOR };

/** The sidebar's single card is larger than Show Info's, to fill the space above the metadata. */
const SIDEBAR_CARD = 172;

/** A family's badge on a list row, the same icon as Show Family. */
const FAMILY_ICON: Image.ImageLike = { source: Icon.AppWindowGrid3x3, tintColor: BADGE_COLOR };

/**
 * One color per category, shared by the category menu's icons and the sidebar's category tags.
 * Raycast's named colors adapt to light and dark, so related categories share a hue.
 */
const CATEGORY_COLORS: Record<string, Color> = {
  whatsnew: Color.Yellow,
  draw: Color.Purple,
  variable: Color.Blue,
  multicolor: Color.Magenta,
  communication: Color.Green,
  weather: Color.Blue,
  maps: Color.Green,
  objectsandtools: Color.Orange,
  devices: Color.Blue,
  cameraandphotos: Color.Magenta,
  gaming: Color.Magenta,
  connectivity: Color.Blue,
  transportation: Color.Orange,
  automotive: Color.Orange,
  accessibility: Color.Purple,
  privacyandsecurity: Color.Red,
  human: Color.Purple,
  home: Color.Orange,
  fitness: Color.Green,
  nature: Color.Green,
  editing: Color.Orange,
  textformatting: Color.Purple,
  media: Color.Red,
  keyboard: Color.Blue,
  commerce: Color.Green,
  time: Color.Yellow,
  health: Color.Red,
  shapes: Color.Magenta,
  arrows: Color.Yellow,
  indices: Color.Purple,
  math: Color.Purple,
};

function categoryColor(name: string): Color {
  return CATEGORY_COLORS[name] ?? Color.PrimaryText;
}

const MODE_LABELS: Record<TileMode, string> = {
  monochrome: "Monochrome",
  hierarchical: "Hierarchical",
  multicolor: "Multicolor",
};

type Tile = { symbol: sfsymbol; familySize: number };

/**
 * One tile per family, in the order the symbols arrived: the first member seen stands in for the
 * family, so a search shows the variant that matched best rather than always the base.
 */
function collapseFamilies(symbols: readonly sfsymbol[], catalog: CatalogIndex, grouped: boolean): Tile[] {
  const familySize = (name: string) => familyMembers(catalog, name).length;
  if (!grouped || catalog.familyOf.size === 0) {
    return symbols.map((symbol) => ({ symbol, familySize: familySize(symbol.name) }));
  }
  const seen = new Set<string>();
  const tiles: Tile[] = [];
  for (const symbol of symbols) {
    const family = catalog.familyOf.get(symbol.name) ?? symbol.name;
    if (seen.has(family)) continue;
    seen.add(family);
    tiles.push({ symbol, familySize: familySize(symbol.name) });
  }
  return tiles;
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Puts the symbols on screen first, so a render reaches what the user is looking at soonest. */
function prioritized(names: readonly string[], first: readonly string[]): string[] {
  const head = [...new Set(first)];
  const seen = new Set(head);
  return [...head, ...names.filter((name) => !seen.has(name))];
}

/**
 * Renders any missing grid tiles with the SF Symbols CLI, showing a live counter while it works.
 * Returns the set of symbols that have a local tile.
 *
 * Colored modes have one set per appearance. The current appearance renders first, with the
 * counter; the other follows quietly, so the icons are ready when the theme changes.
 * `onScreen` names the symbols being shown, which each pass renders first.
 */
function useLocalTiles(
  catalog: CatalogIndex | undefined,
  style: TileStyle,
  onScreen: React.RefObject<readonly string[]>,
): TileSet {
  const tinted = isTinted(style);
  const appearance = environment.appearance;
  const otherAppearance = appearance === "dark" ? "light" : "dark";
  const key = catalog ? tileSetKey(catalog.key, style, appearance) : "";
  const otherKey = catalog && !tinted ? tileSetKey(catalog.key, style, otherAppearance) : "";
  type Rendered = { key: string; names: ReadonlySet<string> };
  const empty: Rendered = { key: "", names: new Set() };
  const [state, setState] = useState<{ own: Rendered; other: Rendered }>({ own: empty, other: empty });
  useEffect(() => {
    if (!catalog || catalog.source !== "app" || !app) return;
    const cliApp: SFSymbolsApp = app;
    let stopped = false;
    const controller = new AbortController();
    // Names are always stored with the set they belong to, so a style switch never points tiles
    // at a folder that doesn't have them yet.
    // Tile sets only grow, so the same key and count means nothing changed: keep the old state and
    // spare the grid a re-render.
    const setOwn = (names: ReadonlySet<string>) =>
      setState((prev) =>
        prev.own.key === key && prev.own.names.size === names.size ? prev : { ...prev, own: { key, names } },
      );
    const setOther = (names: ReadonlySet<string>) =>
      setState((prev) =>
        prev.other.key === otherKey && prev.other.names.size === names.size
          ? prev
          : { ...prev, other: { key: otherKey, names } },
      );
    const label = style.mode === "monochrome" && style.weight === "regular" ? "" : ` ${describeStyle(style)}`;
    const allNames = catalog.symbols.map((symbol) => symbol.name);
    const multicolorNames = new Set(
      catalog.symbols.filter((symbol) => symbol.renderingModes?.multicolor).map((symbol) => symbol.name),
    );

    /** Renders one appearance's set, refreshing the shown names as tiles land. */
    const renderSet = async (
      setKey: string,
      setAppearance: "light" | "dark",
      show: (names: ReadonlySet<string>) => void,
      onCount?: (done: number, total: number) => void,
    ) => {
      // Show whatever is already rendered before doing any work, so a warm cache is sharp at once.
      show(await listTiles(setKey));
      if (stopped) return;
      // The first refresh comes early, so the symbols on screen sharpen within a second or two.
      let nextRefresh = 100;
      await renderMissingTiles(
        cliApp,
        catalog.key,
        style,
        prioritized(allNames, onScreen.current ?? []),
        (done, total) => {
          if (stopped || total === 0) return;
          onCount?.(done, total);
          if (done >= nextRefresh) {
            nextRefresh = done + 1500;
            void listTiles(setKey).then((next) => !stopped && show(next));
          }
        },
        controller.signal,
        setAppearance,
        multicolorNames,
      );
      if (!stopped) show(await listTiles(setKey));
    };

    (async () => {
      let toast: Toast | undefined;
      try {
        await renderSet(key, appearance, setOwn, (done, total) => {
          if (!toast) {
            // Fire the indicator before the work, not after: a silent first launch reads as a stall.
            toast = new Toast({ style: Toast.Style.Animated, title: `Rendering${label} symbols…` });
            void toast.show();
          }
          // Every 50 tiles is plenty for a counter, and spares Raycast thousands of updates.
          if (done % 50 === 0 || done === total)
            toast.message = `${done.toLocaleString()} of ${countOf(total, "symbol")}`;
        });
        if (stopped) return;
        void prunePreviews(catalog.key);
      } catch (error) {
        // The grid keeps the downloaded images, so this is soft-fail: say so rather than leaving
        // the user wondering why new symbols have no image.
        if (!stopped) {
          // Whatever did render is on disk; show it before reporting what didn't.
          setOwn(await listTiles(key));
          await showError(error, { title: "Couldn't Render Symbol Images" });
        }
        // Still go on to the other appearance: tiles that did render need their pair to follow a
        // theme switch, and that set may already be on disk.
      } finally {
        // Always retire the progress toast: leaving it up after the work stops lies about state.
        await toast?.hide();
      }
      if (!otherKey || stopped) return;
      try {
        // Nothing waits on this pass, so it runs without a counter.
        await renderSet(otherKey, otherAppearance, setOther);
      } catch (error) {
        if (!stopped) {
          setOther(await listTiles(otherKey));
          await showError(error, { title: `Couldn't Render Symbol Images for ${capitalize(otherAppearance)} Mode` });
        }
      }
    })();

    return () => {
      stopped = true;
      controller.abort();
    };
  }, [catalog, key, otherKey]);
  return {
    key,
    tinted,
    names: state.own.key === key ? state.own.names : new Set(),
    other: otherKey
      ? { key: otherKey, names: state.other.key === otherKey ? state.other.names : new Set() }
      : undefined,
  };
}

function describeStyle(style: TileStyle): string {
  const weight = style.weight === "regular" ? "" : getWeightLabel(style.weight as (typeof ALL_WEIGHTS)[number]);
  const mode = style.mode === "monochrome" ? "" : MODE_LABELS[style.mode];
  return [weight, mode].filter(Boolean).join(" ");
}

export default function Command(props: LaunchProps<{ arguments: Arguments.Index }>) {
  const {
    data: loaded,
    isLoading: catalogLoading,
    error: catalogError,
    revalidate: reloadCatalog,
  } = usePromise(() => loadCatalog(app), []);
  const catalog = loaded?.catalog;

  useEffect(() => {
    if (loaded?.appError) {
      void showError(loaded.appError, { title: "Couldn't Read SF Symbols", message: "Showing the bundled catalog" });
    }
  }, [loaded]);

  const { data: categoryIcons } = usePromise(
    async (index: CatalogIndex | undefined) =>
      app && index?.source === "app"
        ? renderCategoryIcons(
            app,
            index.key,
            index.categories.map((entry) => entry.symbol),
          )
        : {},
    [catalog],
    // Without them the menu falls back to the downloaded images, tinted the same way.
    { onError: () => {} },
  );

  const [category, setCategory] = useState<string>();
  const [searchText, setSearchText] = useState(props.arguments?.query ?? "");
  const [grouped, setGrouped] = useCachedState("group-families", true);
  const [savedStyle, setStyle] = useCachedState<TileStyle>("tile-style", { mode: "monochrome", weight: "regular" });
  const style: TileStyle = {
    mode: TILE_MODES.includes(savedStyle.mode) ? savedStyle.mode : "monochrome",
    weight: ALL_WEIGHTS.includes(savedStyle.weight as (typeof ALL_WEIGHTS)[number]) ? savedStyle.weight : "regular",
  };
  // The Multicolor category is there to show color, so it keeps its own mode, Multicolor until
  // the user picks another one there. Every other category shares the saved mode.
  const [savedMulticolorMode, setMulticolorMode] = useCachedState<TileMode>("multicolor-category-mode", "multicolor");
  const inMulticolor = category === "multicolor";
  const shownStyle: TileStyle = inMulticolor
    ? { ...style, mode: TILE_MODES.includes(savedMulticolorMode) ? savedMulticolorMode : "multicolor" }
    : style;
  // The View menu reads and writes the style on screen, so its checkmark always matches the tiles.
  const setShownStyle = (next: TileStyle) => {
    if (inMulticolor) {
      setMulticolorMode(next.mode);
      setStyle({ ...style, weight: next.weight });
    } else {
      setStyle(next);
    }
  };
  // The symbols on screen, recorded below once the sections are built, so rendering starts with them.
  const onScreen = useRef<readonly string[]>([]);
  const tiles = useLocalTiles(catalog, shownStyle, onScreen);
  const [pinned, setPinned] = useState<sfsymbol[]>([]);
  const [recent, setRecent] = useState<sfsymbol[]>([]);
  const [refreshState, setRefreshState] = useState(false);
  const refresh = () => setRefreshState((value) => !value);

  // Saved symbols are resolved by name against the current catalog, so an entry saved by an older
  // version (or before the app was installed) picks up today's glyph and metadata.
  useEffect(() => {
    if (!catalog) return;
    const resolve = (saved: sfsymbol[]) =>
      saved.map((s) => catalog.byName.get(s.name)).filter((s): s is sfsymbol => s !== undefined);
    setPinned(resolve(getPinnedSymbols()));
    setRecent(resolve(getRecentSymbols()));
  }, [refreshState, catalog]);

  const query = searchText.trim();
  const latestQuery = useRef(query);
  latestQuery.current = query;
  const { data: searchResults, isLoading: searching } = usePromise(
    // Each result carries the query it answers, so a slow search can never be read as the answer
    // to a newer one. A failure is a result too, for its own query: usePromise's error outlives the
    // run that raised it, so it can't tell a failed query from the next one still searching.
    async (q: string, index: CatalogIndex | undefined) => {
      try {
        return { query: q, symbols: index ? await searchSymbols(index, app, q) : [], failed: false, error: undefined };
      } catch (error) {
        return { query: q, symbols: [] as sfsymbol[], failed: true, error: error ?? new Error("Search failed") };
      }
    },
    [query, catalog],
    { execute: query.length > 0 && catalog !== undefined },
  );
  // While a new search runs, the previous query's results stay on screen (under the loading bar)
  // rather than flashing empty. Decisions about THIS query only use results for this query.
  const plainResults = useMemo(() => (query && searchResults ? searchResults.symbols : []), [query, searchResults]);
  const currentResults = searchResults?.query === query ? searchResults.symbols : undefined;
  // Reported only when it's the answer on screen: a slow search that fails after the user has
  // moved on to another query stays quiet.
  useEffect(() => {
    if (searchResults?.failed && searchResults.query === latestQuery.current) {
      void showError(searchResults.error, { title: "Search Failed" });
    }
  }, [searchResults]);

  // AI suggestions: only once typing pauses, only for searches that read like a description or
  // that found little on their own, and never for users without Raycast AI.
  const aiAvailable = aiSearch && canUseAI();
  const debouncedQuery = useDebouncedValue(query, AI_DEBOUNCE_MS);
  const settled = debouncedQuery === query && !searching && currentResults !== undefined;
  const looksDescriptive = query.includes(" ") || (currentResults?.length ?? 0) < AI_THIN_RESULTS;
  const shouldAskAI = aiAvailable && settled && query.length >= 3 && looksDescriptive;
  const abortable = useRef<AbortController>(null);
  const { data: aiData, isLoading: aiLoading } = usePromise(
    async (q: string) => {
      const signal = abortable.current?.signal;
      try {
        return { query: q, keywords: await suggestKeywords(q, signal) };
      } catch (error) {
        // A request replaced by a newer one is aborted on purpose: rethrown, usePromise drops it
        // quietly, as it does any failure of a call that's no longer the latest.
        if (signal?.aborted) throw error;
        void showError(error, { title: "Couldn't Get AI Suggestions" });
        return { query: q, keywords: [] as string[] };
      }
    },
    [debouncedQuery],
    { execute: shouldAskAI, abortable },
  );

  // usePromise keeps the last reply while the next request runs, so only use a reply to THIS query.
  const aiKeywords = aiData?.query === query ? aiData.keywords : undefined;

  const inCategory = (s: sfsymbol) => !category || category === "all" || s.categories.includes(category);

  const mainTiles = useMemo(() => {
    if (!catalog) return [];
    const source = query ? plainResults : catalog.symbols;
    return collapseFamilies(source.filter(inCategory), catalog, grouped);
  }, [catalog, query, plainResults, category, grouped]);

  const aiTiles = useMemo(() => {
    if (!catalog || !query || !shouldAskAI || !aiKeywords?.length) return [];
    // Hide anything the plain search already shows, including other members of its families
    // when grouped, so the AI section only adds.
    const shownFamilies = new Set(mainTiles.map(({ symbol }) => catalog.familyOf.get(symbol.name) ?? symbol.name));
    const plainNames = new Set(plainResults.map((s) => s.name));
    const candidates = symbolsForKeywords(catalog, aiKeywords).filter(
      (s) =>
        inCategory(s) &&
        !plainNames.has(s.name) &&
        !(grouped && shownFamilies.has(catalog.familyOf.get(s.name) ?? s.name)),
    );
    return collapseFamilies(candidates, catalog, grouped).slice(0, MAX_AI_TILES);
  }, [catalog, query, shouldAskAI, aiKeywords, mainTiles, plainResults, category, grouped]);

  const [savedViewMode, setViewMode] = useCachedState<ViewMode>("view-mode", "grid");
  const viewMode: ViewMode = savedViewMode === "list" ? "list" : "grid";
  const [showingDetail, setShowingDetail] = useCachedState("show-sidebar", true);
  // The preference sets the starting size; the View menu changes it from then on.
  const [savedColumns, setColumns] = useCachedState<string>("grid-columns", gridColumns);
  const columns = GRID_SIZES.some((size) => size.columns === savedColumns) ? savedColumns : gridColumns;
  // The list's own order; the grid always shows Apple's.
  const [savedSort, setSort] = useCachedState<ListSort>("list-sort", "default");
  const sort: ListSort = LIST_SORTS.some((option) => option.value === savedSort) ? savedSort : "default";
  const listSort: ListSort = viewMode === "list" ? sort : "default";

  const context: ViewContext | undefined = catalog
    ? {
        catalog,
        tiles,
        refresh,
        grouped,
        setGrouped,
        style: shownStyle,
        setStyle: setShownStyle,
        viewMode,
        setViewMode,
        columns,
        setColumns,
        showingDetail,
        setShowingDetail,
        sort,
        setSort,
        category,
      }
    : undefined;
  // Until this query has its own answer, the list is still searching, not empty: the plain search
  // hasn't replied, or typing hasn't paused long enough to ask AI, or AI hasn't replied. A failed
  // request has already said so in a toast, so it stops counting as pending.
  const searchFailed = searchResults?.query === query && searchResults.failed;
  const searchPending = query.length > 0 && (searching || currentResults === undefined);
  const aiWillAsk = aiAvailable && query.length >= 3 && (currentResults === undefined || looksDescriptive);
  // AI has answered this query (even with a failure, already reported) once its reply is tagged with it.
  const aiPending = aiWillAsk && !searchFailed && (aiLoading || !settled || aiData?.query !== query);
  // A results header only earns its place beside other sections. Filtered to a category, it's
  // named for the category rather than claiming to be all symbols.
  const savedShown = query ? 0 : pinned.filter(inCategory).length + (showRecent ? recent.filter(inCategory).length : 0);
  const categoryTitle = catalog?.categories.find((entry) => entry.name === category)?.title;
  const resultsTitle = (() => {
    if (query) return "Results";
    if (savedShown === 0) return undefined;
    return category === "all" ? "All Symbols" : categoryTitle;
  })();

  const sections: SectionModel[] = [];
  if (context && category) {
    if (!query) {
      sections.push({
        id: "pinned",
        title: "Pinned",
        entries: pinned.filter(inCategory).map((symbol) => ({ symbol, pinned: true })),
      });
      if (showRecent) {
        sections.push({
          id: "recent",
          title: "Recently Used",
          entries: recent.filter(inCategory).map((symbol) => ({ symbol, recent: true })),
        });
      }
    }
    if (listSort === "category" && category === "all") {
      sections.push(...categorySections(mainTiles, context.catalog, `${grouped}-${query}`));
    } else {
      sections.push({
        id: "results",
        // A new key when the tile set changes shape makes Raycast lay the section out afresh.
        // Reusing it after ungrouping left an empty band above the first row until a scroll.
        key: `results-${grouped}-${category}-${listSort}`,
        title: resultsTitle,
        subtitle: query ? countOf(mainTiles.length, "match") : undefined,
        entries: listSort === "name" ? byName(mainTiles) : mainTiles,
      });
    }
    if (aiTiles.length > 0) {
      sections.push({
        id: "ai",
        title: "AI Suggestions",
        subtitle: aiKeywords?.join(", "),
        entries: listSort === "name" ? byName(aiTiles) : aiTiles,
      });
    }
  }
  onScreen.current = sections.flatMap((section) => section.entries.map((entry) => entry.symbol.name));
  const nothingShown = mainTiles.length === 0 && aiTiles.length === 0;
  const stillSearching = context && category && query && nothingShown && (searchPending || aiPending);
  const noResults = context && category && query && nothingShown && !searchPending && !aiPending;
  const failed = noResults && searchFailed;
  // With no catalog at all nothing can search, so the retry state replaces every loading indicator.
  const catalogFailed = !!catalogError && !catalog;

  return (
    <SymbolsView
      context={context}
      viewMode={viewMode}
      columns={columns}
      showingDetail={showingDetail}
      sections={sections}
      isLoading={catalogLoading || (!catalogFailed && (category === undefined || searchPending || aiPending))}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={aiAvailable ? "Search or describe a symbol…" : "Search SF Symbols…"}
      categories={
        catalog && {
          all: { value: catalog.categories[0].name, title: "All Categories", symbol: catalog.categories[0].symbol },
          rest: catalog.categories
            .slice(1)
            .map((entry) => ({ value: entry.name, title: entry.title, symbol: entry.symbol })),
          icons: categoryIcons ?? {},
          onChange: setCategory,
        }
      }
      emptyView={
        catalogFailed
          ? {
              title: "Couldn't Load Symbols",
              description: "The symbol list couldn't be read. Try again, or copy the error from the toast.",
              actions: (
                <ActionPanel>
                  <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={reloadCatalog} />
                </ActionPanel>
              ),
            }
          : stillSearching
            ? {
                title: "Searching…",
                description: searchPending
                  ? "Looking through every symbol."
                  : "Asking Raycast AI for symbols that fit the description.",
              }
            : failed
              ? {
                  title: "Search Failed",
                  description: "The symbols couldn't be searched. Try again, or copy the error from the toast.",
                }
              : noResults
                ? {
                    title: "No Symbols Found",
                    description: aiAvailable
                      ? "Try another word, or describe what the symbol shows."
                      : "Try a shorter or different word.",
                  }
                : undefined
      }
    />
  );
}

type CategoryEntry = { value: string; title: string; symbol: string };

type SymbolsViewProps = {
  /** Missing until the catalog loads. */
  context?: ViewContext;
  viewMode: ViewMode;
  columns: string;
  showingDetail: boolean;
  sections: SectionModel[];
  inFamily?: boolean;
  isLoading?: boolean;
  navigationTitle?: string;
  searchBarPlaceholder: string;
  /** When set, the caller filters; otherwise Raycast filters by name. */
  /** The search bar's text, when the caller controls it (a launch argument can fill it). */
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
  categories?: {
    all: CategoryEntry;
    rest: CategoryEntry[];
    /** Category icon symbol name → its black monochrome rendering. */
    icons: Record<string, string>;
    onChange: (value: string) => void;
  };
  emptyView?: { title: string; description: string; actions?: React.JSX.Element };
};

function entryId(section: SectionModel, entry: Entry): string {
  return `${section.id}:${entry.symbol.name}`;
}

/**
 * Sidebar cards already built this session, so returning to a symbol shows its card at once.
 * Each is a few dozen KB of base64, so only the most recent are kept.
 */
const sidebarCards = new Map<string, string>();
const SIDEBAR_CARDS_KEPT = 150;

function rememberCard(id: string, markdown: string) {
  sidebarCards.delete(id);
  sidebarCards.set(id, markdown);
  if (sidebarCards.size > SIDEBAR_CARDS_KEPT) sidebarCards.delete(sidebarCards.keys().next().value ?? "");
}

/**
 * A card whose preview is already on disk (rendered in this or an earlier session), built during
 * render so the sidebar never shows the small tile first. Undefined when the CLI must render it.
 */
function cardFromDisk(id: string, catalogKey: string, name: string, mode: TileMode, weight: string) {
  try {
    const file = previewPath(catalogKey, name, mode, weight);
    const markdown = previewStripMarkdown([{ label: MODE_LABELS[mode], file }], SIDEBAR_CARD);
    rememberCard(id, markdown);
    return markdown;
  } catch {
    // Not rendered yet, or pruned since: the CLI renders it.
    return undefined;
  }
}

/** The same sections, drawn as a grid of tiles or as a list with a metadata sidebar. */
function SymbolsView(props: SymbolsViewProps) {
  const { context, sections, categories, emptyView } = props;
  const [selectedId, setSelectedId] = useState<string>();
  const searchProps = props.onSearchTextChange
    ? {
        searchText: props.searchText,
        onSearchTextChange: props.onSearchTextChange,
        filtering: false,
        throttle: true,
      }
    : {};
  const list = props.viewMode === "list";
  const ids = list ? sections.flatMap((section) => section.entries.map((entry) => entryId(section, entry))) : [];
  // Only the selected row builds its sidebar, so moving through thousands of rows stays cheap.
  const selected = selectedId && ids.includes(selectedId) ? selectedId : ids[0];
  const selectedName = selected?.slice(selected.indexOf(":") + 1);

  // The sidebar draws the selected symbol the way Show Info does: a sharp rendering on an SVG card.
  // Until it's ready (or without the app), the sidebar shows the grid's tile.
  // Raycast reports the appearance only at launch, so the card is drawn for that one.
  const appearance = environment.appearance;
  const symbol = selectedName ? context?.catalog.byName.get(selectedName) : undefined;
  const mode: TileMode =
    context && symbol && (context.style.mode === "monochrome" || symbol.renderingModes?.[context.style.mode])
      ? context.style.mode
      : "monochrome";
  const weight = context?.style.weight ?? "regular";
  const catalogKey = context?.catalog.source === "app" ? context.catalog.key : undefined;
  const cardId = [selectedName, catalogKey, mode, weight, appearance].join("|");
  const wantsCard = list && props.showingDetail && !!selectedName && !!catalogKey && !!app;
  const cachedCard =
    sidebarCards.get(cardId) ??
    (wantsCard && selectedName && catalogKey
      ? cardFromDisk(cardId, catalogKey, selectedName, mode, weight)
      : undefined);
  // Arrowing through rows renders nothing until the selection rests; cached cards show at once.
  const restedName = useDebouncedValue(selectedName, CARD_DEBOUNCE_MS);
  const { data: sidebarCard } = usePromise(
    async (name: string, key: string, cardMode: TileMode, cardWeight: string, shownAppearance: string) => {
      if (!app) return undefined;
      const previews = await renderPreviews(app, key, name, [cardMode], cardWeight);
      const file = previews[cardMode];
      const markdown = file ? previewStripMarkdown([{ label: MODE_LABELS[cardMode], file }], SIDEBAR_CARD) : undefined;
      // Tagged with what it shows, so a slow rendering is never shown beside another symbol.
      const id = [name, key, cardMode, cardWeight, shownAppearance].join("|");
      if (markdown) rememberCard(id, markdown);
      return { id, markdown };
    },
    [selectedName ?? "", catalogKey ?? "", mode, weight, appearance],
    // A failed rendering keeps the tile in the sidebar; arrowing through rows shouldn't raise toasts.
    {
      execute: wantsCard && !cachedCard && restedName === selectedName,
      onError: () => {},
    },
  );
  const sidebarImage = cachedCard ?? (sidebarCard?.id === cardId ? sidebarCard.markdown : undefined);

  if (list) {
    return (
      <List
        isLoading={props.isLoading}
        navigationTitle={props.navigationTitle}
        searchBarPlaceholder={props.searchBarPlaceholder}
        {...searchProps}
        isShowingDetail={props.showingDetail && ids.length > 0}
        onSelectionChange={(id) => setSelectedId(id ?? undefined)}
        searchBarAccessory={
          categories && (
            <List.Dropdown tooltip="Select SF Symbol category" storeValue={true} onChange={categories.onChange}>
              <List.Dropdown.Item
                value={categories.all.value}
                title={categories.all.title}
                icon={categoryIcon(categories.all, categories.icons)}
              />
              <List.Dropdown.Section>
                {categories.rest.map((entry) => (
                  <List.Dropdown.Item
                    key={entry.value}
                    value={entry.value}
                    title={entry.title}
                    icon={categoryIcon(entry, categories.icons)}
                  />
                ))}
              </List.Dropdown.Section>
            </List.Dropdown>
          )
        }
      >
        {context &&
          sections.map((section) => (
            <List.Section key={section.key ?? section.id} title={section.title} subtitle={section.subtitle}>
              {section.entries.map((entry) => {
                const id = entryId(section, entry);
                return (
                  <SymbolListItem
                    key={id}
                    id={id}
                    detailed={props.showingDetail && id === selected}
                    sidebarImage={sidebarImage}
                    context={context}
                    inFamily={props.inFamily}
                    {...entry}
                  />
                );
              })}
            </List.Section>
          ))}
        {emptyView && <List.EmptyView icon={Icon.MagnifyingGlass} {...emptyView} />}
      </List>
    );
  }

  return (
    <Grid
      isLoading={props.isLoading}
      navigationTitle={props.navigationTitle}
      searchBarPlaceholder={props.searchBarPlaceholder}
      {...searchProps}
      inset={Grid.Inset.Large}
      columns={Number(props.columns)}
      searchBarAccessory={
        categories && (
          <Grid.Dropdown tooltip="Select SF Symbol category" storeValue={true} onChange={categories.onChange}>
            <Grid.Dropdown.Item
              value={categories.all.value}
              title={categories.all.title}
              icon={categoryIcon(categories.all, categories.icons)}
            />
            <Grid.Dropdown.Section>
              {categories.rest.map((entry) => (
                <Grid.Dropdown.Item
                  key={entry.value}
                  value={entry.value}
                  title={entry.title}
                  icon={categoryIcon(entry, categories.icons)}
                />
              ))}
            </Grid.Dropdown.Section>
          </Grid.Dropdown>
        )
      }
    >
      {context &&
        sections.map((section) => (
          <Grid.Section key={section.key ?? section.id} title={section.title} subtitle={section.subtitle}>
            {section.entries.map((entry) => (
              <SymbolGridItem key={entryId(section, entry)} context={context} inFamily={props.inFamily} {...entry} />
            ))}
          </Grid.Section>
        ))}
      {emptyView && <Grid.EmptyView icon={Icon.MagnifyingGlass} {...emptyView} />}
    </Grid>
  );
}

/** A category's menu icon, tinted to the category's color (All stays in the text color). */
function categoryIcon(entry: CategoryEntry, icons: Record<string, string>): Image.ImageLike {
  const tintColor = categoryColor(entry.value);
  const file = icons[entry.symbol];
  return { source: file ?? getImageURL(entry.symbol), fallback: Icon.Circle, tintColor };
}

function symbolImage(name: string, tiles: TileSet): Image.ImageLike {
  if (tiles.names.has(name)) {
    const own = tilePath(tiles.key, name);
    if (tiles.other?.names.has(name)) {
      // Colored tiles can't be tinted, so Raycast gets one per appearance and picks by theme.
      const other = tilePath(tiles.other.key, name);
      const source = environment.appearance === "dark" ? { light: other, dark: own } : { light: own, dark: other };
      return { source, fallback: Icon.Warning };
    }
    return { source: own, fallback: Icon.Warning, tintColor: tiles.tinted ? Color.PrimaryText : undefined };
  }
  // The downloaded images are black monochrome, so they're always tinted.
  return { source: getImageURL(name), fallback: Icon.Warning, tintColor: Color.PrimaryText };
}

function availabilityText(symbol: sfsymbol): string | undefined {
  const parts = PLATFORMS.filter((platform) => symbol.availability?.[platform]).map(
    (platform) => `${platform} ${symbol.availability?.[platform]}`,
  );
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

type TileProps = {
  context: ViewContext;
  symbol: sfsymbol;
  familySize?: number;
  pinned?: boolean;
  recent?: boolean;
  /** Set inside a family view, where the tile must not offer to open its own family again. */
  inFamily?: boolean;
  /** Set inside the info view, which must not offer to open itself again. */
  inDetail?: boolean;
};

/** "+3 variants" on a family's stand-in, wherever the family is collapsed into it. */
function variantsLabel(props: TileProps, familySize: number): string | undefined {
  const collapsed = props.context.grouped && !props.inFamily && !props.pinned && !props.recent;
  return collapsed && familySize > 1 ? `+${countOf(familySize - 1, "variant")}` : undefined;
}

function minimumVersion(symbol: sfsymbol): string | undefined {
  const version = minimumVersionOS !== "disabled" ? symbol.availability?.[minimumVersionOS as Platform] : undefined;
  return version ? `${minimumVersionOS} ${version}` : undefined;
}

const SymbolGridItem = (props: TileProps) => {
  const { context, symbol } = props;
  const familySize = props.familySize ?? familyMembers(context.catalog, symbol.name).length;
  const version = minimumVersion(symbol);
  const subtitle = showName ? (version ?? variantsLabel(props, familySize)) : undefined;

  const availability = availabilityText(symbol);
  // Inside a family, a pinned member is marked, since the grid doesn't otherwise say which is pinned.
  const pinned = usePinned(symbol.name, !!props.inFamily);
  return (
    <Grid.Item
      title={showName ? symbol.name : undefined}
      subtitle={subtitle}
      keywords={[symbol.name]}
      content={{
        tooltip: [symbol.name, availability, symbol.restriction].filter(Boolean).join("\n"),
        value: symbolImage(symbol.name, context.tiles),
      }}
      // The same notice SF Symbols shows behind a symbol's info badge.
      accessory={
        pinned
          ? { icon: Icon.Tack, tooltip: "Pinned" }
          : symbol.restriction
            ? { icon: RESTRICTION_ICON, tooltip: symbol.restriction }
            : undefined
      }
      actions={<SymbolActions {...props} familySize={familySize} />}
    />
  );
};

const SymbolListItem = (props: TileProps & { id: string; detailed: boolean; sidebarImage?: string }) => {
  const { context, symbol, id, detailed, sidebarImage, ...rest } = props;
  const familySize = props.familySize ?? familyMembers(context.catalog, symbol.name).length;
  const base = context.catalog.familyOf.get(symbol.name);
  const variants = variantsLabel(props, familySize);
  // With the sidebar open, the row keeps to badges; with it closed, the row carries what the
  // sidebar would have said at a glance.
  const roomy = !context.showingDetail;
  const inFamilyPinned = usePinned(symbol.name, !!props.inFamily);
  const accessories: List.Item.Accessory[] = [];
  if (roomy && context.category !== "whatsnew" && symbol.categories.includes("whatsnew")) {
    accessories.push({ tag: { value: "New", color: categoryColor("whatsnew") }, tooltip: "New in this release" });
  }
  if (roomy) {
    const version = minimumVersion(symbol) ?? (symbol.availability?.iOS ? `iOS ${symbol.availability.iOS}` : undefined);
    if (version) accessories.push({ text: version, tooltip: availabilityText(symbol) ?? null });
  }
  if (base && familySize > 1 && !props.inFamily) {
    accessories.push({
      icon: FAMILY_ICON,
      // A collapsed row already says how many variants it stands for.
      text: roomy && !variants ? String(familySize) : undefined,
      tooltip: `${base} family, ${countOf(familySize, "symbol")}`,
    });
  }
  if (symbol.restriction) accessories.push({ icon: RESTRICTION_ICON, tooltip: symbol.restriction });
  if (inFamilyPinned) accessories.push({ icon: Icon.Tack, tooltip: "Pinned" });
  return (
    <List.Item
      id={id}
      title={symbol.name}
      // Beside the sidebar the row is narrow, so the count stands alone.
      subtitle={variants && !roomy ? `+${familySize - 1}` : variants}
      keywords={[symbol.name]}
      icon={symbolImage(symbol.name, context.tiles)}
      accessories={accessories}
      detail={detailed ? symbolSidebar(context, symbol, sidebarImage) : undefined}
      actions={<SymbolActions context={context} symbol={symbol} {...rest} familySize={familySize} />}
    />
  );
};

/** A markdown image of the symbol's tile, tinted to the theme when the tile is a tinted one. */
function tileMarkdown(name: string, tiles: TileSet, height: number): string {
  if (tiles.names.has(name)) {
    const tint = tiles.tinted ? `&raycast-tint-color=${environmentTint()}` : "";
    return `![${name}](${pathToFileURL(tilePath(tiles.key, name)).href}?raycast-height=${height}${tint})`;
  }
  return downloadedMarkdown(name, height);
}

/** The downloaded image, which is black, tinted to the theme. */
function downloadedMarkdown(name: string, height: number): string {
  return `![${name}](${getImageURL(name)}?raycast-height=${height}&raycast-tint-color=${environmentTint()})`;
}

/**
 * The list sidebar: the symbol on its card, then its metadata. A restriction isn't repeated here;
 * the row's info badge and the Use row already carry it.
 */
function symbolSidebar(context: ViewContext, symbol: sfsymbol, image?: string): React.JSX.Element {
  return (
    <List.Item.Detail
      markdown={image ?? tileMarkdown(symbol.name, context.tiles, 96)}
      metadata={<SymbolMetadata Metadata={List.Item.Detail.Metadata} catalog={context.catalog} symbol={symbol} />}
    />
  );
}

/**
 * What SF Symbols shows in its info inspector, for the list sidebar and the info view. The sidebar
 * also lists availability, which the info view shows as a table instead.
 */
function SymbolMetadata({
  Metadata,
  catalog,
  symbol,
  withTable,
}: {
  Metadata: typeof Detail.Metadata;
  catalog: CatalogIndex;
  symbol: sfsymbol;
  withTable?: boolean;
}) {
  usePinRevision();
  const pinned = isPinnedSymbol(symbol.name);
  const categoryTitles = new Map(catalog.categories.map((entry) => [entry.name, entry.title]));
  const base = catalog.familyOf.get(symbol.name);
  const familySize = familyMembers(catalog, symbol.name).length;
  const platforms = PLATFORMS.filter((platform) => symbol.availability?.[platform]);
  return (
    <Metadata>
      <Metadata.Label title="Name" text={symbol.name} />
      {pinned && <Metadata.Label title="Pinned" text="Yes" icon={Icon.Tack} />}
      {symbol.codepoint && <Metadata.Label title="Code Point" text={symbol.codepoint} />}
      {base && familySize > 1 && <Metadata.Label title="Family" text={`${base} (${countOf(familySize, "symbol")})`} />}
      {symbol.restriction && <Metadata.Label title="Use" text="Restricted" icon={RESTRICTION_ICON} />}
      {!withTable && platforms.length > 0 && (
        <Metadata.TagList title="Available Since">
          {platforms.map((platform) => (
            <Metadata.TagList.Item key={platform} text={`${platform} ${symbol.availability?.[platform]}`} />
          ))}
        </Metadata.TagList>
      )}
      {symbol.categories.length > 0 && (
        <Metadata.TagList title="Categories">
          {symbol.categories.map((name) => (
            <Metadata.TagList.Item key={name} text={categoryTitles.get(name) ?? name} color={categoryColor(name)} />
          ))}
        </Metadata.TagList>
      )}
      {symbol.searchTerms.length > 0 && (
        <Metadata.TagList title="Tags">
          {symbol.searchTerms.map((term) => (
            <Metadata.TagList.Item key={term} text={term} />
          ))}
        </Metadata.TagList>
      )}
    </Metadata>
  );
}

/** How often a pushed family view rechecks for tiles still being rendered. */
const FAMILY_TILE_POLL_MS = 1500;

function FamilyView({ context, base }: { context: ViewContext; base: string }) {
  // Pinned members come first, each group in Apple's order; pinning here moves a member up at once.
  usePinRevision();
  const pinnedNames = new Set(getPinnedSymbols().map((pinned) => pinned.name));
  const inOrder = familyMembers(context.catalog, base);
  const members = [
    ...inOrder.filter((member) => pinnedNames.has(member.name)),
    ...inOrder.filter((member) => !pinnedNames.has(member.name)),
  ];
  // A pushed view holds the grid's state as it was when it opened. If its tile sets were still
  // rendering, pick up the members' tiles as they land rather than keeping the placeholders.
  const { key, other } = context.tiles;
  const [names, setNames] = useState(context.tiles.names);
  const [otherNames, setOtherNames] = useState(other?.names ?? new Set<string>());
  const missing = members.some(
    (member) => !names.has(member.name) || (other !== undefined && !otherNames.has(member.name)),
  );
  // Without the app nothing renders tiles, so there's nothing to poll for.
  const rendering = app !== null && context.catalog.source === "app";
  useEffect(() => {
    if (!missing || !rendering) return;
    const poll = () => {
      const update = (setter: typeof setNames) => (next: ReadonlySet<string>) =>
        setter((prev) => (prev.size === next.size ? prev : next));
      void listTiles(key).then(update(setNames));
      if (other) void listTiles(other.key).then(update(setOtherNames));
    };
    const timer = setInterval(poll, FAMILY_TILE_POLL_MS);
    // A full render takes about ten seconds; past a minute, a still-missing tile isn't coming.
    const stop = setTimeout(() => clearInterval(timer), 60_000);
    return () => {
      clearInterval(timer);
      clearTimeout(stop);
    };
  }, [missing, rendering, key, other?.key]);
  const live: ViewContext = {
    ...context,
    tiles: { ...context.tiles, names, other: other && { key: other.key, names: otherNames } },
  };
  return (
    <SymbolsView
      context={live}
      viewMode={context.viewMode}
      columns={context.columns}
      showingDetail={context.showingDetail}
      sections={[{ id: "family", entries: members.map((symbol) => ({ symbol, familySize: members.length })) }]}
      inFamily
      navigationTitle={`${base} Family`}
      searchBarPlaceholder={`Search ${countOf(members.length, "symbol")}…`}
    />
  );
}

const SymbolActions = (props: TileProps & { familySize: number }): React.JSX.Element => {
  const { context, symbol, familySize, inFamily, inDetail } = props;
  const { name } = symbol;
  const glyph = symbol.symbol;
  // Pushed views (Show Info, Show Family) don't carry the pinned flag, so Pin or Unpin comes from
  // storage, and every mounted panel redraws when any of them pins.
  usePinRevision();
  const saveProps: SymbolProps = {
    symbol,
    refresh: context.refresh,
    pinned: isPinnedSymbol(name),
    recent: props.recent,
  };
  const remember = () => {
    addRecentSymbol(symbol);
    context.refresh();
  };

  // A few dozen symbols have no font glyph, only a name; those offer the name actions alone.
  const actions: Record<"paste" | "copy" | "pasteName" | "copyName", React.JSX.Element | null> = {
    paste: glyph ? (
      <Action.Paste
        key="paste"
        title="Paste Symbol"
        content={glyph}
        shortcut={{ modifiers: ["shift", "opt"], key: "v" }}
        onPaste={remember}
      />
    ) : null,
    copy: glyph ? (
      <Action.CopyToClipboard
        key="copy"
        title="Copy Symbol"
        content={glyph}
        shortcut={{ modifiers: ["shift", "opt"], key: "c" }}
        onCopy={remember}
      />
    ) : null,
    pasteName: (
      <Action.Paste
        key="pasteName"
        title="Paste Name"
        content={name}
        shortcut={{ modifiers: ["shift", "cmd"], key: "v" }}
        onPaste={remember}
      />
    ),
    copyName: (
      <Action.CopyToClipboard
        key="copyName"
        title="Copy Name"
        content={name}
        shortcut={Keyboard.Shortcut.Common.Copy}
        onCopy={remember}
      />
    ),
  };

  // Without a glyph, the symbol actions fall back to their name counterparts, so a "paste" preference
  // still pastes and a "copy" preference still copies.
  if (!glyph) {
    actions.paste = actions.pasteName;
    actions.copy = actions.copyName;
  }

  let order: (React.JSX.Element | null)[];
  if (primaryAction == "pasteSymbol") {
    order = [actions.paste, actions.copy, actions.copyName, actions.pasteName];
  } else if (primaryAction == "pasteName") {
    order = [actions.pasteName, actions.copyName, actions.paste, actions.copy];
  } else if (primaryAction == "copyName") {
    order = [actions.copyName, actions.pasteName, actions.copy, actions.paste];
  } else {
    order = [actions.copy, actions.paste, actions.copyName, actions.pasteName];
  }

  const base = context.catalog.familyOf.get(name);
  const hasFamily = base !== undefined && familySize > 1;

  return (
    <ActionPanel title={name}>
      {[...new Set(order.filter((action) => action !== null))]}
      <ActionPanel.Section title="Symbol">
        {!inDetail && (
          <Action.Push
            title="Show Info"
            icon={Icon.Info}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            target={<SymbolDetail context={context} symbol={symbol} />}
          />
        )}
        {hasFamily && !inFamily && (
          <Action.Push
            title="Show Family"
            icon={Icon.AppWindowGrid3x3}
            shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
            target={<FamilyView context={context} base={base} />}
          />
        )}
      </ActionPanel.Section>
      {
        // Pushed views hold a snapshot of the grid's settings, so these only appear in the main grid.
        !inFamily && !inDetail && <ViewActions context={context} />
      }
      {app && context.catalog.source === "app" && (
        <ExportActions cliApp={app} name={name} family={hasFamily ? base : undefined} context={context} />
      )}
      <SaveActions {...saveProps} />
    </ActionPanel>
  );
};

function ViewActions({ context }: { context: ViewContext }) {
  const { style, setStyle } = context;
  const hasTiles = app !== null && context.catalog.source === "app";
  const list = context.viewMode === "list";
  return (
    <ActionPanel.Section title="View">
      {list ? (
        <Action
          title="View as Grid"
          icon={Icon.AppWindowGrid3x3}
          shortcut={{ modifiers: ["cmd"], key: "g" }}
          onAction={() => context.setViewMode("grid")}
        />
      ) : (
        <Action
          title="View as List"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "l" }}
          onAction={() => context.setViewMode("list")}
        />
      )}
      {list && (
        <ActionPanel.Submenu title="Sort by…" icon={Icon.NumberList}>
          {LIST_SORTS.map((option) => (
            <Action
              key={option.value}
              title={option.title}
              icon={option.value === context.sort ? Icon.CheckCircle : Icon.Circle}
              onAction={() => context.setSort(option.value)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      {list ? (
        <Action
          title={context.showingDetail ? "Hide Sidebar" : "Show Sidebar"}
          icon={Icon.Sidebar}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
          onAction={() => context.setShowingDetail(!context.showingDetail)}
        />
      ) : (
        <ActionPanel.Submenu title="Grid Size…" icon={Icon.Maximize}>
          {GRID_SIZES.map((size) => (
            <Action
              key={size.columns}
              title={size.title}
              icon={size.columns === context.columns ? Icon.CheckCircle : Icon.Circle}
              onAction={() => context.setColumns(size.columns)}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      {context.catalog.familyOf.size > 0 && (
        <Action
          title={context.grouped ? "Show All Variants" : "Group Variants into Families"}
          icon={context.grouped ? Icon.AppWindowGrid3x3 : Icon.AppWindowGrid2x2}
          shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
          onAction={() => context.setGrouped(!context.grouped)}
        />
      )}
      {hasTiles && (
        <ActionPanel.Submenu
          title="Rendering Mode…"
          icon={Icon.Swatch}
          shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
        >
          {TILE_MODES.map((mode) => (
            <Action
              key={mode}
              title={MODE_LABELS[mode]}
              icon={mode === style.mode ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setStyle({ ...style, mode })}
            />
          ))}
        </ActionPanel.Submenu>
      )}
      {hasTiles && (
        <ActionPanel.Submenu title="Weight…" icon={Icon.Text} shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}>
          {ALL_WEIGHTS.map((weight) => (
            <Action
              key={weight}
              title={getWeightLabel(weight)}
              icon={weight === style.weight ? Icon.CheckCircle : Icon.Circle}
              onAction={() => setStyle({ ...style, weight })}
            />
          ))}
        </ActionPanel.Submenu>
      )}
    </ActionPanel.Section>
  );
}

const PLATFORM_ROWS = ["iOS", "macOS", "Mac Catalyst", "tvOS", "watchOS", "visionOS"];
const AVAILABILITY_MODES = ["monochrome", "hierarchical", "palette", "multicolor"];

/** The theme's text color, for tinting the black downloaded images in markdown. */
function environmentTint(): string {
  return textColor(environment.appearance);
}

/**
 * Everything SF Symbols shows in its info and rendering inspectors that Raycast can: the symbol in
 * each rendering mode it supports, availability per mode and platform, categories, tags, and any
 * usage restriction.
 */
function SymbolDetail({ context, symbol }: { context: ViewContext; symbol: sfsymbol }) {
  const { catalog } = context;
  // Previews are drawn in the theme's text color, which Raycast reports only at launch.
  const appearance = environment.appearance;
  const supported = TILE_MODES.filter((mode) => mode === "monochrome" || symbol.renderingModes?.[mode]);
  const { data: rendered, isLoading } = usePromise(
    async (name: string, shownAppearance: string) => {
      if (!app || catalog.source !== "app") return null;
      const previews = await renderPreviews(app, catalog.key, name, supported, context.style.weight);
      const markdown = previewStripMarkdown(
        supported.flatMap((mode) => {
          const file = previews[mode];
          return file ? [{ label: MODE_LABELS[mode], file }] : [];
        }),
      );
      // Tagged with the appearance it was drawn for: usePromise keeps the last result while a new
      // one renders, or after it fails, and an old appearance's strip mustn't stand in for it.
      return { appearance: shownAppearance, markdown };
    },
    [symbol.name, appearance],
    { onError: (error) => void showError(error, { title: "Couldn't Render Symbol" }) },
  );

  const lines: string[] = [];
  const strip = rendered?.appearance === appearance ? rendered.markdown : undefined;
  if (strip) {
    lines.push(strip, "");
  } else if (!isLoading) {
    // Without the app there's no renderer: show the downloaded image, tinted to the theme.
    lines.push(downloadedMarkdown(symbol.name, 120), "");
  }

  const modes = AVAILABILITY_MODES.filter((mode) => symbol.renderingModes?.[mode]);
  if (modes.length > 0) {
    lines.push(
      "## Availability",
      "",
      `| Platform | ${modes.map(capitalize).join(" | ")} |`,
      `| --- | ${modes.map(() => "---").join(" | ")} |`,
      ...PLATFORM_ROWS.filter((platform) => modes.some((mode) => symbol.renderingModes?.[mode]?.[platform])).map(
        (platform) =>
          `| ${platform} | ${modes.map((mode) => symbol.renderingModes?.[mode]?.[platform] ?? "—").join(" | ")} |`,
      ),
    );
  } else {
    const availability = availabilityText(symbol);
    if (availability) lines.push("## Availability", "", availability);
  }

  const familySize = familyMembers(catalog, symbol.name).length;
  return (
    <Detail
      navigationTitle={symbol.name}
      isLoading={isLoading}
      markdown={lines.join("\n")}
      metadata={
        <SymbolMetadata Metadata={Detail.Metadata} catalog={catalog} symbol={symbol} withTable={modes.length > 0} />
      }
      actions={<SymbolActions context={context} symbol={symbol} familySize={familySize} inDetail />}
    />
  );
}

function ExportActions({
  cliApp,
  name,
  family,
  context,
}: {
  cliApp: SFSymbolsApp;
  name: string;
  family?: string;
  context: ViewContext;
}) {
  return (
    <React.Fragment>
      <ActionPanel.Section title="Export">
        <Action
          title="Export Symbol"
          icon={Icon.Download}
          // ⌘E matches Common.Edit's chord, but exporting isn't editing — a wrong
          // semantic match is worse than an honest custom shortcut.
          // eslint-disable-next-line @raycast/prefer-common-shortcut
          shortcut={{ modifiers: ["cmd"], key: "e" }}
          onAction={() => exportWithToast(cliApp, [name])}
        />
        <ActionPanel.Submenu title="Export Symbol Size…" icon={Icon.Download}>
          {ALL_SIZES.map((size) => (
            <Action
              key={size}
              title={`${size} Points`}
              icon={Icon.Download}
              onAction={() => exportWithToast(cliApp, [name], { size, formats: sizedFormats })}
            />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Export Symbol Weight…" icon={Icon.Download}>
          {ALL_WEIGHTS.map((weight) => (
            <Action
              key={weight}
              title={getWeightLabel(weight)}
              icon={Icon.Download}
              onAction={() => exportWithToast(cliApp, [name], { weight, formats: sizedFormats })}
            />
          ))}
        </ActionPanel.Submenu>
        <ActionPanel.Submenu title="Export Symbol as…" icon={Icon.Download}>
          {ALL_FORMATS.map((format) => (
            <Action
              key={format}
              title={format === "svg" ? "SVG Template" : getFormatLabel(format)}
              icon={Icon.Download}
              onAction={() => exportWithToast(cliApp, [name], { formats: [format] })}
            />
          ))}
        </ActionPanel.Submenu>
        {family && (
          <Action
            title="Export Family"
            icon={Icon.Download}
            shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            onAction={() =>
              exportWithToast(
                cliApp,
                familyMembers(context.catalog, family).map((member) => member.name),
              )
            }
          />
        )}
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Image">
        <Action
          title="Copy Image"
          icon={Icon.Image}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          onAction={() => copyImageWithToast(cliApp, name)}
        />
        <ActionPanel.Submenu title="Copy Image Size…" icon={Icon.Image}>
          {ALL_SIZES.map((size) => (
            <Action
              key={size}
              title={`${size} Points`}
              icon={Icon.Image}
              onAction={() => copyImageWithToast(cliApp, name, { size })}
            />
          ))}
        </ActionPanel.Submenu>
      </ActionPanel.Section>
    </React.Fragment>
  );
}
