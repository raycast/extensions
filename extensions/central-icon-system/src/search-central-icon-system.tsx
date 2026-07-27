import { Action, ActionPanel, Color, Grid, Icon, Toast, getPreferenceValues, showToast } from "@raycast/api";
import { useCachedState, useLocalStorage } from "@raycast/utils";
import { useEffect, useMemo, useRef, useState } from "react";
import { IconActions } from "./actions";
import {
  cachedDataUri,
  categoriesFor,
  clearUriCache,
  defaultBuiltAxes,
  invalidateManifests,
  loadTiles,
  axisOptions,
  readSvg,
} from "./lib/manifest";
import { categoryIcon } from "./lib/category-icon";
import { searchTiles } from "./lib/search";
import { installStyle } from "./lib/install-style";
import { markFailed } from "./lib/toast";
import { ensureQuickLook, quickLookPath } from "./lib/png";
import { getPinnedIds, getRecentIds } from "./lib/storage";
import { DEFAULT_BACKDROP, fillLabel, svgToDataUri, withBackdrop, type Backdrop } from "./lib/svg";
import { CORNERS, cornerKey } from "./types";
import type { Fill, IconTile, ShowFilter, Stroke } from "./types";

const ALL_CATEGORIES = "__all__";

/**
 * Maximum tiles rendered at once.
 *
 * Not a cache size — a hard cap on `Grid.Item`s, and the thing that actually
 * governs whether this command survives. Each rendered tile holds a ~1.4 KB data
 * URI, and **every** re-render reallocates all of them, so re-render churn — not
 * peak footprint — is what kills it. Rendering all 4,156 tiles walked RSS from
 * 93 MB to 151 MB over four backdrop changes; it still climbed with the URI
 * cache disabled and GC forced, because allocation simply outruns collection.
 *
 * Measured over 40 backdrop changes (a deliberately punishing loop):
 *
 * | Cap | RSS after 40 changes |
 * |---|---|
 * | 4,156 | crash |
 * | 500 | 126 MB — still climbing |
 * | 300 | **93 MB — holds** |
 * | 200 | 92 MB |
 *
 * 300 over 200 because the difference is 1 MB and it shows noticeably more.
 * A Small grid displays ~40 at once, so this is still an order of magnitude more
 * than any viewport.
 */
const RENDER_LIMIT = 300;

function fillsFor(show: ShowFilter): Fill[] {
  if (show === "outlined") return ["outlined"];
  if (show === "filled") return ["filled"];
  return ["outlined", "filled"];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();

  // Preferences are a snapshot taken at launch — Raycast has no live-update
  // mechanism for them. Anything a user might want to change mid-session is
  // therefore mirrored into `useCachedState`, seeded from the preference, and
  // driven from the action panel. The preference sets the default; the submenu
  // overrides it and persists.
  const [columns, setColumns] = useCachedState<number>("columns", parseInt(preferences.gridSize, 10));
  const [showName, setShowName] = useCachedState<boolean>("showName", preferences.showName);

  // Style axes persist across launches — a project-level choice, not a
  // per-session mode. Fill is not here: it's a facet of the tile list itself.
  // Corner is one axis over the five real options, not join × radius — the two
  // aren't independent (square ships radius-0 only). Persisted as a key so a
  // stored value can't drift into an impossible pair.
  const [cornerId, setCornerId] = useCachedState<string>("corner", cornerKey({ join: "round", radius: 2 }));
  const corner = CORNERS.find((c) => cornerKey(c) === cornerId) ?? CORNERS[3];
  const { join, radius } = corner;
  const [stroke, setStroke] = useCachedState<Stroke>("stroke", "1.5");
  const [show, setShow] = useCachedState<ShowFilter>("show", preferences.show as ShowFilter);

  const {
    value: backdrop,
    setValue: setBackdrop,
    isLoading: backdropLoading,
  } = useLocalStorage<Backdrop>("preview-backdrop", DEFAULT_BACKDROP);
  const activeBackdrop = backdrop ?? DEFAULT_BACKDROP;

  const [category, setCategory] = useState<string | undefined>(undefined);
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  // Bumping this re-reads pins and recents after a mutating action.
  const [revision, setRevision] = useState(0);
  const refresh = () => setRevision((n) => n + 1);

  // Installing a style from inside the extension. A Store install ships no icon
  // data (it's proprietary and gitignored) and no build script, so this is the
  // only route to a working grid for anyone who didn't clone the repo.
  const [installing, setInstalling] = useState(false);
  // Synchronous re-entrancy guard. `installing` is React state, so it does not
  // change until the next render — a double Enter fires `install` twice before
  // the guard reads true, and two concurrent installs of the same style then
  // race over the same paths. A ref flips immediately; the state is only for
  // the rendered "Installing…" label.
  const inFlight = useRef(false);
  const install = async (styles: string[]) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setInstalling(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Installing icons…" });
    let completed = 0;
    try {
      for (const style of styles) {
        const version = await installStyle(style, (message) => {
          toast.message = message;
        });
        completed += 1;
        toast.title = `Installed v${version}`;
        toast.message = undefined;
      }
      toast.style = Toast.Style.Success;
      toast.title = styles.length > 1 ? `Installed ${styles.length} styles` : "Style installed";
    } catch (error) {
      markFailed(toast, "Couldn't install this style", error);
    } finally {
      // Refresh on ANY outcome that wrote something. A multi-style install that
      // fails on the third style has still landed the first two, and skipping
      // this left them invisible until relaunch — the grid kept serving the
      // memoized miss from before they existed.
      if (completed > 0) {
        invalidateManifests();
        refresh();
      }
      inFlight.current = false;
      setInstalling(false);
    }
  };

  // `revision` is a dependency so the Reload action re-reads from disk: a user
  // who just ran the build command needs the new style to appear without
  // relaunching. Cheap — loadTiles reads two ~0.26 MB indexes, no geometry.
  const { tiles, missing } = useMemo(
    () => loadTiles({ join, radius, stroke }, fillsFor(show)),
    [join, radius, stroke, show, revision],
  );

  // Every axis value, flagged installed/not. All are offered so the full style
  // set stays reachable; uninstalled ones route to the install screen.
  const axes = useMemo(() => axisOptions({ join, radius, stroke }), [join, radius, stroke]);

  // Deliberately no auto-reset here. Selecting an uninstalled style shows the
  // install screen with its command and a way back — snapping to an installed
  // style would make the other 28 unreachable, since the user could never see
  // what to install.

  const categories = useMemo(() => categoriesFor(tiles), [tiles]);

  const pinnedIds = useMemo(() => getPinnedIds(), [revision]);
  const recentIds = useMemo(() => getRecentIds(), [revision]);

  const scoped = useMemo(
    () => (category && category !== ALL_CATEGORIES ? tiles.filter((t) => t.category === category) : tiles),
    [tiles, category],
  );

  // Filter and cap before the grid sees anything — see `searchTiles`. `total`
  // is the uncapped match count, so truncation is stated rather than hidden;
  // silently dropping results reads as "that icon doesn't exist".
  const { results: matched, total: matchCount } = useMemo(
    () => searchTiles(scoped, searchText, RENDER_LIMIT),
    [scoped, searchText],
  );
  const truncated = matchCount > matched.length;

  const byId = useMemo(() => new Map(matched.map((t) => [t.id, t])), [matched]);
  const pinned = useMemo(
    () => pinnedIds.map((id) => byId.get(id)).filter((t): t is IconTile => Boolean(t)),
    [pinnedIds, byId],
  );
  const recent = useMemo(
    () => recentIds.map((id) => byId.get(id)).filter((t): t is IconTile => Boolean(t)),
    [recentIds, byId],
  );
  const rest = useMemo(
    () => matched.filter((t) => !pinnedIds.includes(t.id) && !recentIds.includes(t.id)),
    [matched, pinnedIds, recentIds],
  );

  // Quick Look previews are rendered for the SELECTED tile only, on demand.
  //
  // resvg's WASM memory only grows, so rasterizing a batch on mount is what
  // killed this command twice: ~1.4 MB per render, and Raycast caps a command
  // at 100 MB. Rendering one tile as it's highlighted keeps the cost bounded by
  // what the user actually looks at, and results are cached on disk so
  // re-selecting an icon costs nothing.
  const [readyIds, setReadyIds] = useState<Set<string>>(new Set());

  // Raycast doesn't fire `onSelectionChange` until the user moves, so on first
  // launch nothing is selected. Fall back to the first tile in display order so
  // the highlighted item always has an action panel and ↵ works immediately.
  const firstId = pinned[0]?.id ?? recent[0]?.id ?? rest[0]?.id;
  const activeId = selectedId ?? firstId;
  const selected = activeId ? byId.get(activeId) : undefined;

  // Rasterize the highlighted tile's preview in the background. Failure is
  // silent by design: ⌘Y simply stays unavailable for that tile, which is not
  // worth a toast interrupting a keyboard sweep through the grid.
  useEffect(() => {
    if (!selected || readyIds.has(selected.id)) return;
    let cancelled = false;
    ensureQuickLook(selected).then((path) => {
      if (!cancelled && path) setReadyIds((previous) => new Set(previous).add(selected.id));
    });
    return () => {
      cancelled = true;
    };
  }, [selected, readyIds]);

  // Cached URIs bake in the backdrop, so they're only valid for the backdrop
  // that produced them. Style/category changes don't need a flush — those keys
  // simply stop being requested and age out of the LRU on their own.
  useEffect(() => clearUriCache(), [activeBackdrop]);

  /**
   * Render a tile, attaching the action panel ONLY to the selected item.
   *
   * This is the difference between working and crashing. Each `IconActions`
   * tree is ~40 nested elements (6 payloads, 3 PNG size submenus, 4 style
   * submenus, backdrop, pin, clear). Building one per tile costs ~31 KB, so
   * 4,156 tiles allocate ~129 MB of React elements and blow the command's
   * 100 MB heap limit before the grid ever paints. Measured: 128.8 MB eager vs
   * 11.1 MB with content only.
   *
   * Raycast only ever displays the action panel of the highlighted item, so
   * building the other 4,155 is pure waste. `onSelectionChange` re-renders on
   * every arrow key, which rebuilds exactly one panel.
   */
  const renderTile = (tile: IconTile) => {
    const quickLook = readyIds.has(tile.id) ? { path: quickLookPath(tile.id), name: tile.name } : undefined;
    const isSelected = tile.id === activeId;

    // Artwork is fetched through a bounded LRU keyed by tile id, so whatever
    // Raycast decides to draw — scrolled to, or surfaced by a search — gets real
    // geometry. Only past ~900 simultaneously-visible icons does a tile fall
    // back to a placeholder. Loading all 4,156 at once costs ~114 MB with a
    // backdrop, over the command limit.
    const uri = cachedDataUri(`${tile.id}:${activeBackdrop}`, () => {
      const svg = readSvg(tile.style, tile.name);
      return svg === null ? null : svgToDataUri(withBackdrop(svg, activeBackdrop));
    });

    return (
      <Grid.Item
        key={tile.id}
        id={tile.id}
        title={showName ? tile.name : undefined}
        subtitle={showName && show === "all" ? fillLabel(tile.fill) : undefined}
        keywords={tile.keywords}
        content={{
          value: uri
            ? {
                source: uri,
                // Central icons are uniformly `currentColor`; tint them to the
                // theme text color unless a backdrop baked in its own palette.
                tintColor: activeBackdrop === DEFAULT_BACKDROP ? Color.PrimaryText : null,
              }
            : { source: Icon.Circle, tintColor: Color.SecondaryText },
          tooltip: `${tile.name} · ${fillLabel(tile.fill)}`,
        }}
        quickLook={quickLook}
        actions={
          isSelected ? (
            <IconActions
              tile={tile}
              primaryAction={preferences.primaryAction}
              onUse={refresh}
              axes={axes}
              columns={columns}
              showName={showName}
              setColumns={setColumns}
              setShowName={setShowName}
              corner={corner}
              stroke={stroke}
              show={show}
              backdrop={activeBackdrop}
              setCorner={(value) => setCornerId(cornerKey(value))}
              setStroke={setStroke}
              setShow={setShow}
              setBackdrop={setBackdrop}
              quickLook={quickLook}
            />
          ) : undefined
        }
      />
    );
  };

  if (missing.length > 0 && tiles.length === 0) {
    const fallback = defaultBuiltAxes();
    return (
      <Grid columns={columns}>
        <Grid.EmptyView
          icon={Icon.Download}
          title="This style isn't installed yet"
          description={
            installing
              ? "Downloading and parsing 2,078 icons…"
              : "Install it to browse this style. Around 5 MB, downloaded from npm."
          }
          actions={
            <ActionPanel>
              {/* The whole point: a Store user has no clone and no build
                  script, so the install has to happen here. */}
              <Action
                title={installing ? "Installing…" : "Install This Style"}
                icon={Icon.Download}
                onAction={() => install(missing)}
              />
              {/* Always offer a way out. A style with no data used to be a dead
                  end that survived relaunch, since the choice persists. */}
              {fallback && (
                <Action
                  // "Go Back" rather than naming a style: the user is returning
                  // to where they were, and which style that is isn't something
                  // the label can state without being misleading.
                  title="Go Back"
                  icon={Icon.ArrowLeft}
                  onAction={() => {
                    setCornerId(cornerKey(fallback));
                    setStroke(fallback.stroke);
                  }}
                />
              )}
              <Action.OpenInBrowser title="View Changelog" icon={Icon.Clock} url="https://centralicons.com/changelog" />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  return (
    <Grid
      columns={columns}
      // A backdrop needs the full tile to paint into, and `Grid.Inset` insets an
      // item's content — the rect included — so it has to come off for the fill
      // to reach the edges. `withBackdrop` compensates by expanding the SVG
      // canvas, keeping the glyph the same apparent size in both modes.
      inset={activeBackdrop === DEFAULT_BACKDROP ? Grid.Inset.Large : undefined}
      isLoading={backdropLoading || category === undefined}
      filtering={false}
      onSearchTextChange={setSearchText}
      onSelectionChange={(id) => setSelectedId(id ?? undefined)}
      navigationTitle={selected ? `Central Icons – ${selected.name}` : "Central Icons"}
      searchBarPlaceholder={`Search ${scoped.length.toLocaleString()} icons…`}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Category" storeValue onChange={setCategory}>
          <Grid.Dropdown.Item title="All Categories" value={ALL_CATEGORIES} icon={categoryIcon("All")} />
          <Grid.Dropdown.Section>
            {categories.map((name) => (
              <Grid.Dropdown.Item key={name} title={name} value={name} icon={categoryIcon(name)} />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {/* Nothing renders until the dropdown reports its restored value.
          `storeValue` restores asynchronously, so painting first shows the full
          unfiltered set and then visibly re-filters — the startup flash. SF
          Symbols gates its whole grid on the same signal. */}
      {category !== undefined && (
        <>
          <Grid.Section title="Pinned">{pinned.map(renderTile)}</Grid.Section>
          <Grid.Section title="Recently Used">{recent.map(renderTile)}</Grid.Section>
          {/* The "All Icons" header only earns its place once it has siblings. */}
          <Grid.Section
            title={pinned.length + recent.length > 0 ? "All Icons" : undefined}
            subtitle={truncated ? `showing ${rest.length} of ${matchCount}` : undefined}
          >
            {rest.map(renderTile)}
          </Grid.Section>
        </>
      )}
    </Grid>
  );
}
