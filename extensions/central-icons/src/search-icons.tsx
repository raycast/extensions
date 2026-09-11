import { Action, ActionPanel, Color, getPreferenceValues, Grid, Icon } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import {
  loadPackData,
  monthLabel,
  searchTextOf,
  sortIconNames,
  sortedCategories,
  type MaskMode,
  type VariantParts,
} from "./icons";
import { IconGridItem, GRID_SIZE_OPTIONS } from "./icon-item";
import { useExportGate } from "./gate";
import { usePack } from "./use-pack";
import { useSemanticSearch } from "./semantic-search";

const ALL_CATEGORY = "All";
const NEW_CATEGORY = "New";
const MAX_SEARCH_RESULTS = 500;
const LOAD_BATCH = 400;

interface Preferences {
  gridColumns: string;
  fill: "outlined" | "filled";
  stroke: string;
  radius: string;
  join: "round" | "square";
  masking: MaskMode;
}

const CHECK = { source: Icon.Checkmark, tintColor: Color.Blue } as const;

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [variant, setVariant] = useState<VariantParts>({
    join: preferences.join,
    fill: preferences.fill,
    stroke: preferences.stroke,
    radius: preferences.radius,
  });
  const [size, setSize] = useState(
    () => GRID_SIZE_OPTIONS.find((o) => o.columns === Number(preferences.gridColumns))?.title ?? "Small",
  );
  const [maskMode, setMaskMode] = useState<MaskMode>(preferences.masking ?? "raw");
  const [category, setCategory] = useState(ALL_CATEGORY);
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(LOAD_BATCH);
  const { pack, packError, reload } = usePack();
  const gate = useExportGate();

  const packData = useMemo(() => (pack ? loadPackData(pack) : null), [pack]);
  const categories = useMemo(() => (packData ? sortedCategories(packData.categories) : []), [packData]);

  const query = searchText.trim().toLowerCase();
  const searching = query.length > 0;

  const matches = useMemo(() => {
    if (!packData) return [];
    const source =
      category === ALL_CATEGORY
        ? packData.iconNames
        : category === NEW_CATEGORY
          ? packData.iconNames.filter((n) => packData.newIconNames.has(n))
          : (packData.iconNamesByCategory[category] ?? []);
    if (!searching) return source;
    return source.filter((name) => searchTextOf(packData.metadata, name).includes(query)).slice(0, MAX_SEARCH_RESULTS);
  }, [packData, category, query, searching]);

  const excludeSet = useMemo(() => new Set(matches), [matches]);
  const { suggestions, isLoading: suggestionsLoading } = useSemanticSearch(searchText, packData, excludeSet);

  // Browsing order matching the website: "All" = category sections (Social
  // Media & Brands last, icons alphabetical); "New" = monthly changelog
  // sections, newest first.
  const browseEntries = useMemo((): { name: string; section?: string }[] => {
    if (!packData || searching) return [];
    if (category === ALL_CATEGORY) {
      return categories.flatMap((c) =>
        sortIconNames(packData.iconNamesByCategory[c] ?? []).map((name) => ({
          name,
          section: c,
        })),
      );
    }
    if (category === NEW_CATEGORY) {
      return matches
        .map((name) => ({
          name,
          date: new Date(packData.metadata[name].createdAt),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map(({ name, date }) => ({ name, section: monthLabel(date) }));
    }
    return sortIconNames(matches).map((name) => ({ name }));
  }, [packData, categories, category, matches, searching]);

  useEffect(() => {
    setVisibleCount(LOAD_BATCH);
  }, [category, searching]);

  const visibleEntries = useMemo(() => browseEntries.slice(0, visibleCount), [browseEntries, visibleCount]);

  const pageSections = useMemo(() => {
    const sections: { title: string | undefined; names: string[] }[] = [];
    for (const { name, section } of visibleEntries) {
      const last = sections[sections.length - 1];
      if (last && last.title === section) last.names.push(name);
      else sections.push({ title: section, names: [name] });
    }
    return sections;
  }, [visibleEntries]);

  function onFilterChange(value: string) {
    const i = value.indexOf(":");
    const kind = value.slice(0, i);
    const v = value.slice(i + 1);
    switch (kind) {
      case "fill":
        setVariant((x) => ({ ...x, fill: v as VariantParts["fill"] }));
        break;
      case "stroke":
        setVariant((x) => ({ ...x, stroke: v }));
        break;
      case "radius":
        setVariant((x) => ({ ...x, radius: v }));
        break;
      case "join":
        setVariant((x) => ({
          ...x,
          join: v as VariantParts["join"],
          radius: v === "square" ? "0" : x.radius,
        }));
        break;
      case "size":
        setSize(v as (typeof GRID_SIZE_OPTIONS)[number]["title"]);
        break;
      case "mask":
        setMaskMode(v as MaskMode);
        break;
    }
  }

  const itemProps =
    pack && packData
      ? {
          pack,
          iconCount: packData.iconNames.length,
          variant,
          maskMode,
          categories,
          category,
          onCategoryChange: setCategory,
          gate,
          onCheckUpdates: reload,
        }
      : null;

  const renderItems = (names: string[]) =>
    itemProps
      ? names.map((name) => <IconGridItem key={name} name={name} {...itemProps} selected={selectedId === name} />)
      : null;

  if (packError) {
    return (
      <Grid>
        <Grid.EmptyView
          title="Couldn't Load Icons"
          description={packError}
          icon={Icon.WifiDisabled}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={reload} />
            </ActionPanel>
          }
        />
      </Grid>
    );
  }

  const isEmpty = searching && !suggestionsLoading && matches.length === 0 && suggestions.length === 0;
  const effectiveRadius = variant.join === "square" ? "0" : variant.radius;
  const sizeOption = GRID_SIZE_OPTIONS.find((o) => o.title === size) ?? GRID_SIZE_OPTIONS[1];
  const dropdownItem = (section: string, value: string, title: string, current: string) => (
    <Grid.Dropdown.Item
      key={`${section}:${value}`}
      title={title}
      value={`${section}:${value}`}
      icon={value === current ? CHECK : Icon.Circle}
    />
  );

  return (
    <Grid
      columns={sizeOption.columns}
      inset={sizeOption.inset}
      filtering={false}
      isLoading={!pack || suggestionsLoading}
      navigationTitle="Central Icons"
      onSelectionChange={setSelectedId}
      pagination={
        searching || visibleCount >= browseEntries.length
          ? undefined
          : {
              pageSize: LOAD_BATCH,
              hasMore: true,
              onLoadMore: () => setVisibleCount((c) => Math.min(c + LOAD_BATCH, browseEntries.length)),
            }
      }
      onSearchTextChange={setSearchText}
      searchBarPlaceholder={packData ? `Search ${packData.iconNames.length} icons…` : "Downloading icons…"}
      searchBarAccessory={
        <Grid.Dropdown tooltip="Style & Size" onChange={onFilterChange}>
          <Grid.Dropdown.Section title="Fill">
            {dropdownItem("fill", "outlined", "Outlined", variant.fill)}
            {dropdownItem("fill", "filled", "Filled", variant.fill)}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Stroke Width">
            {dropdownItem("stroke", "1", "1px", variant.stroke)}
            {dropdownItem("stroke", "1.5", "1.5px", variant.stroke)}
            {dropdownItem("stroke", "2", "2px", variant.stroke)}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Corner Radius">
            {dropdownItem("radius", "0", "0 (sharp)", effectiveRadius)}
            {variant.join === "round" && (
              <>
                {dropdownItem("radius", "1", "1", effectiveRadius)}
                {dropdownItem("radius", "2", "2", effectiveRadius)}
                {dropdownItem("radius", "3", "3 (round)", effectiveRadius)}
              </>
            )}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Line Join">
            {dropdownItem("join", "round", "Round", variant.join)}
            {dropdownItem("join", "square", "Square", variant.join)}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Icon Size">
            {GRID_SIZE_OPTIONS.map((option) => dropdownItem("size", option.title, option.title, size))}
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Masking">
            {dropdownItem("mask", "raw", "Raw (Separate Paths)", maskMode)}
            {dropdownItem("mask", "masked", "Masked (Overlap-Safe)", maskMode)}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {isEmpty && (
        <Grid.EmptyView
          title="No Icons Found"
          description="Try a different search term or category."
          icon={Icon.MagnifyingGlass}
        />
      )}
      {searching ? (
        <>
          {matches.length > 0 && <Grid.Section title="Exact Matches">{renderItems(matches)}</Grid.Section>}
          {suggestions.length > 0 && <Grid.Section title="Suggestions (Beta)">{renderItems(suggestions)}</Grid.Section>}
        </>
      ) : (
        pageSections.map((section) =>
          section.title ? (
            <Grid.Section key={section.title} title={section.title}>
              {renderItems(section.names)}
            </Grid.Section>
          ) : (
            renderItems(section.names)
          ),
        )
      )}
    </Grid>
  );
}
