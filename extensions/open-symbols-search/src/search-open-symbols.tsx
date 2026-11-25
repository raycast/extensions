import { Grid, LaunchProps, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { SymbolItem } from "./components/symbol-grid";
import { UpdateView } from "./components/update-view";
import { getCatalog, onCatalogReload, OpenSymbol, searchSymbols } from "./lib/data";
import { GRID_COLUMNS, prefs, useSymbolState } from "./lib/state";
import { usePreviews } from "./lib/use-previews";
import { maybeAutoCheck } from "./lib/update-state";

const PAGE_SIZE = 96;

export default function Command(props: LaunchProps<{ arguments: Arguments.SearchOpenSymbols }>) {
  const catalog = getCatalog();
  const state = useSymbolState();
  const [searchText, setSearchText] = useState(props.arguments.query ?? props.fallbackText ?? "");
  const [library, setLibrary] = useState<string>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const { push } = useNavigation();
  // Bumped when an update installs a new symbol list, so results are recomputed.
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => setVisible(PAGE_SIZE), [searchText, library]);
  useEffect(() => onCatalogReload(() => setDataVersion((v) => v + 1)), []);
  useEffect(() => {
    maybeAutoCheck(() => push(<UpdateView embedded />));
  }, []);

  const inLibrary = (s: OpenSymbol) => library === "all" || s.library.id === library;
  const matches = useMemo(() => searchSymbols(searchText, library), [searchText, library, dataVersion]);
  const matchKeys = useMemo(() => new Set(matches.map((s) => s.key)), [matches]);
  const query = searchText.trim();

  // Pinned and recent symbols sit above the results, filtered by the same query.
  const pinned = state.pinned.filter((s) => inLibrary(s) && (!query || matchKeys.has(s.key)));
  const showRecents = (prefs().showRecents ?? true) && !query;
  const pinnedKeys = new Set(pinned.map((s) => s.key));
  const recent = showRecents ? state.recent.filter((s) => inLibrary(s) && !pinnedKeys.has(s.key)).slice(0, 16) : [];
  const page = matches.slice(0, visible);

  // Only re-run preview work when the set of on-screen symbols actually changes.
  const onScreenKey = [...pinned, ...recent, ...page].map((s) => s.key).join("|");
  const onScreen = useMemo(() => [...pinned, ...recent, ...page], [onScreenKey]);
  const previews = usePreviews(onScreen, state.weight);
  const showLibrary = library === "all";

  const item = (s: OpenSymbol, section: string) => (
    <SymbolItem
      key={`${section}:${s.key}`}
      symbol={s}
      section={section}
      preview={previews.get(s)}
      failed={previews.hasFailed(s)}
      state={state}
      showLibrary={showLibrary}
    />
  );

  return (
    <Grid
      columns={GRID_COLUMNS[state.gridSize]}
      inset={Grid.Inset.Small}
      filtering={false}
      throttle
      isLoading={state.isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search symbols by name or tag, or paste an Xcode name…"
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore: visible < matches.length,
        onLoadMore: () => setVisible((v) => v + PAGE_SIZE),
      }}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Library" storeValue onChange={setLibrary}>
          <Grid.Dropdown.Item title={`All Libraries (${catalog.symbols.length.toLocaleString()})`} value="all" />
          <Grid.Dropdown.Section title="Libraries">
            {catalog.libraries.map((l) => (
              <Grid.Dropdown.Item
                key={l.id}
                title={`${l.name} (${(catalog.countByLibrary.get(l.id) ?? 0).toLocaleString()})`}
                value={l.id}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {pinned.length > 0 && <Grid.Section title="Pinned">{pinned.map((s) => item(s, "pinned"))}</Grid.Section>}
      {recent.length > 0 && <Grid.Section title="Recently Used">{recent.map((s) => item(s, "recent"))}</Grid.Section>}
      <Grid.Section title={query ? "Results" : "All Symbols"} subtitle={matches.length.toLocaleString()}>
        {page.map((s) => item(s, "results"))}
      </Grid.Section>
      {matches.length === 0 && (
        <Grid.EmptyView title="No symbols found" description="Try another word, or switch to All Libraries." />
      )}
    </Grid>
  );
}
