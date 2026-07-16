/* eslint-disable @raycast/prefer-title-case -- titles contain acronyms (SVG/PNG/URI/HEX/FILL) that Title-Case autofix would mangle */
import { ReactElement, useEffect, useMemo, useState } from "react";
import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Grid,
  Icon,
  Image,
  getPreferenceValues,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import {
  Axes,
  buildSvg,
  getCleanPath,
  svgToDataUri,
  SymbolStyle,
} from "./lib/svg";
import {
  getByName,
  listCategories,
  loadSymbols,
  searchSymbols,
  SymbolEntry,
} from "./lib/symbols";
import {
  buildLucideSvg,
  getLucideByName,
  loadLucide,
  LucideEntry,
} from "./lib/lucide";
import { writePngFile } from "./lib/png";
import { toLucideComponent, toReactComponent } from "./lib/format";
import { ColorForm } from "./components/ColorForm";

const PAGE_SIZE = 100;
// Max items rendered at once. Each item carries an ActionPanel, so rendering
// thousands at once blows up the worker's memory — search to reach the rest.
const MAX_RENDER = 500;
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700];
const STROKES = [1, 1.5, 2, 2.5, 3];
const SIZE_PRESETS = [16, 20, 24, 32, 40, 48, 64, 96, 128, 256];
const COLOR_PRESETS: { title: string; value: string }[] = [
  { title: "Auto (currentColor)", value: "currentColor" },
  { title: "Black", value: "#000000" },
  { title: "White", value: "#FFFFFF" },
  { title: "Light Blue", value: "#0081E8" },
  { title: "Red", value: "#E53935" },
  { title: "Orange", value: "#FB8C00" },
  { title: "Amber", value: "#FFB300" },
  { title: "Green", value: "#43A047" },
  { title: "Teal", value: "#00ACC1" },
  { title: "Blue", value: "#1E88E5" },
  { title: "Indigo", value: "#3949AB" },
  { title: "Purple", value: "#8E24AA" },
  { title: "Pink", value: "#D81B60" },
  { title: "Gray", value: "#9E9E9E" },
];

type PrimaryAction = "paste-png" | "copy-png" | "copy-svg" | "paste-svg";
const PRIMARY_KEYS: PrimaryAction[] = [
  "paste-png",
  "copy-png",
  "copy-svg",
  "paste-svg",
];

type IconEntry = SymbolEntry | LucideEntry;

interface Prefs {
  primaryAction: PrimaryAction;
  style: SymbolStyle;
  fill: boolean;
  weight: string;
  color: string;
  size: string;
  columns: string;
}

const clampWeight = (w: number) =>
  WEIGHTS.reduce((a, b) => (Math.abs(b - w) < Math.abs(a - w) ? b : a), 400);
const clampSize = (s: number) =>
  Number.isFinite(s) && s > 0 ? Math.min(s, 1024) : 24;
const clampColumns = (c: number) =>
  Number.isFinite(c) ? Math.min(Math.max(c, 3), 8) : 8;

/** Swatch icon for a color. currentColor is shown as an outline circle. */
function swatch(color: string): Image.ImageLike {
  return color === "currentColor"
    ? { source: Icon.Circle, tintColor: Color.SecondaryText }
    : { source: Icon.CircleFilled, tintColor: color };
}

export default function Command() {
  const prefs = getPreferenceValues<Prefs>();
  const columns = clampColumns(parseInt(prefs.columns ?? "8", 10));

  // --- Appearance settings, remembered across launches ---
  // variant = "ms:outlined" | "ms:rounded" | "ms:sharp" | "lucide"
  const [variant, setVariant] = useCachedState<string>(
    "ms-variant",
    `ms:${prefs.style ?? "outlined"}`,
  );
  const [fill, setFill] = useCachedState<boolean>(
    "ms-fill",
    prefs.fill ?? false,
  );
  const [weight, setWeight] = useCachedState<number>(
    "ms-weight",
    clampWeight(parseInt(prefs.weight ?? "400", 10)),
  );
  const [stroke, setStroke] = useCachedState<number>("ms-lucide-stroke", 2);
  const [color, setColor] = useCachedState<string>(
    "ms-color",
    (prefs.color || "currentColor").trim(),
  );
  const [size, setSize] = useCachedState<number>(
    "ms-size",
    clampSize(parseInt(prefs.size ?? "24", 10)),
  );
  const [favorites, setFavorites] = useCachedState<string[]>(
    "ms-favorites",
    [],
  );
  const [recents, setRecents] = useCachedState<string[]>("ms-recents", []);
  const [recentColors, setRecentColors] = useCachedState<string[]>(
    "ms-recent-colors",
    [],
  );

  // --- Loaded data ---
  const [symbols, setSymbols] = useState<SymbolEntry[]>([]);
  const [lucide, setLucide] = useState<LucideEntry[]>([]);
  const [msCategories, setMsCategories] = useState<string[]>([]);
  const [lucideCategories, setLucideCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Session state ---
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    try {
      const ms = loadSymbols();
      setSymbols(ms);
      setMsCategories(listCategories(ms));
    } catch {
      /* noop */
    }
    try {
      const lu = loadLucide();
      setLucide(lu);
      setLucideCategories(listCategories(lu));
    } catch {
      /* Material still works even if lucide.json is missing */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
    setCategory("");
  }, [variant]);
  useEffect(() => setPage(1), [query, category]);

  const isLucide = variant === "lucide";
  const setKey = isLucide ? "lucide" : "ms";
  const style = (isLucide ? "outlined" : variant.slice(3)) as SymbolStyle;
  const axes: Axes = { fill: fill ? 1 : 0, weight, grade: 0, opsz: 24 };

  const pool: IconEntry[] = isLucide ? lucide : symbols;
  const categoriesList = isLucide ? lucideCategories : msCategories;

  const previewColor = color === "currentColor" ? "#000000" : color;
  const displayTint = color === "currentColor" ? Color.PrimaryText : undefined;
  const pngColor = color === "currentColor" ? "#000000" : color;
  const pngWidth = Math.max(size, 128);

  // --- Per-set SVG/path generation ---
  const makeSvg = (entry: IconEntry, c: string, sz: number): string | null => {
    if (isLucide)
      return buildLucideSvg({
        inner: (entry as LucideEntry).inner,
        color: c,
        size: sz,
        strokeWidth: stroke,
      });
    return buildSvg({
      style,
      codePoint: (entry as SymbolEntry).codePoint,
      axes,
      color: c,
      size: sz,
    });
  };

  // --- State helpers (favorites/recents are namespaced by set) ---
  const fav = (name: string) => `${setKey}:${name}`;
  const isFav = (name: string) => favorites.includes(fav(name));
  const markUsed = (name: string) =>
    setRecents((prev) =>
      [fav(name), ...prev.filter((n) => n !== fav(name))].slice(0, 80),
    );
  const toggleFavorite = (name: string) =>
    setFavorites((prev) =>
      prev.includes(fav(name))
        ? prev.filter((n) => n !== fav(name))
        : [fav(name), ...prev],
    );
  const applyColor = (c: string) => {
    setColor(c);
    if (c.startsWith("#"))
      setRecentColors((prev) =>
        [c, ...prev.filter((x) => x !== c)].slice(0, 8),
      );
  };
  const resolve = (name: string): IconEntry | undefined =>
    isLucide ? getLucideByName(name) : getByName(name);
  const stripSet = (key: string) =>
    key.startsWith(`${setKey}:`) ? key.slice(setKey.length + 1) : null;
  const cycleWeight = (d: number) =>
    setWeight(
      WEIGHTS[
        Math.min(Math.max(WEIGHTS.indexOf(weight) + d, 0), WEIGHTS.length - 1)
      ],
    );
  const cycleStroke = (d: number) =>
    setStroke(
      STROKES[
        Math.min(Math.max(STROKES.indexOf(stroke) + d, 0), STROKES.length - 1)
      ],
    );

  // --- Build the list ---
  const base = useMemo(
    () =>
      category ? pool.filter((e) => e.categories.includes(category)) : pool,
    [pool, category],
  );
  const trimmedQuery = query.trim();
  const results = useMemo(
    () => (trimmedQuery ? searchSymbols(base, query) : base),
    [base, query, trimmedQuery],
  );

  type Section = { title: string; items: IconEntry[] };
  let sections: Section[];
  let hasMore: boolean;
  const limit = Math.min(page * PAGE_SIZE, MAX_RENDER);

  if (trimmedQuery) {
    const shown = results.slice(0, limit);
    hasMore = shown.length < results.length && shown.length < MAX_RENDER;
    const label =
      results.length > shown.length
        ? `top ${shown.length} / ${results.length}`
        : `${results.length}`;
    sections = [{ title: `Search Results (${label})`, items: shown }];
  } else {
    const inCat = (e: IconEntry) =>
      !category || e.categories.includes(category);
    const favNames = favorites.map(stripSet).filter((n): n is string => !!n);
    const recNames = recents.map(stripSet).filter((n): n is string => !!n);
    const favItems = favNames
      .map(resolve)
      .filter((e): e is IconEntry => !!e && inCat(e));
    const favSet = new Set(favItems.map((e) => e.name));
    const recItems = recNames
      .map(resolve)
      .filter((e): e is IconEntry => !!e && !favSet.has(e.name) && inCat(e));
    const used = new Set([...favItems, ...recItems].map((e) => e.name));
    const popular = results.filter((e) => !used.has(e.name));
    const shownPopular = popular.slice(0, limit);
    hasMore =
      shownPopular.length < popular.length && shownPopular.length < MAX_RENDER;
    const capped =
      popular.length > shownPopular.length && shownPopular.length >= MAX_RENDER;

    sections = [];
    if (favItems.length)
      sections.push({
        title: `Favorites (${favItems.length})`,
        items: favItems,
      });
    if (recItems.length)
      sections.push({ title: "Recently Used", items: recItems });
    sections.push({
      title: `${category || "Popular"}${capped ? ` (top ${shownPopular.length} · search for more)` : ""}`,
      items: shownPopular,
    });
  }

  // Global appearance controls are identical for every item, so build them once
  // and reuse the same element in each ActionPanel (far fewer elements = less memory).
  const appearanceSection = (
    <ActionPanel.Section title="Appearance">
      <ActionPanel.Submenu
        title="Color"
        icon={swatch(color)}
        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
      >
        {COLOR_PRESETS.map((p) => (
          <Action
            key={p.value}
            title={p.title}
            icon={swatch(p.value)}
            onAction={() => applyColor(p.value)}
          />
        ))}
        {recentColors.length > 0 && (
          <ActionPanel.Section title="Recent Colors">
            {recentColors.map((c) => (
              <Action
                key={c}
                title={c}
                icon={swatch(c)}
                onAction={() => applyColor(c)}
              />
            ))}
          </ActionPanel.Section>
        )}
        <ActionPanel.Section>
          <Action.Push
            title="Custom HEX…"
            icon={Icon.Pencil}
            target={<ColorForm initial={color} onSubmit={applyColor} />}
          />
        </ActionPanel.Section>
      </ActionPanel.Submenu>

      <ActionPanel.Submenu
        title="Size"
        icon={Icon.Ruler}
        shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
      >
        {SIZE_PRESETS.map((s) => (
          <Action
            key={s}
            title={`${s}px`}
            icon={size === s ? Icon.Checkmark : Icon.Dot}
            onAction={() => setSize(s)}
          />
        ))}
      </ActionPanel.Submenu>

      {isLucide ? (
        <ActionPanel.Submenu title="Stroke Width" icon={Icon.LineChart}>
          {STROKES.map((s) => (
            <Action
              key={s}
              title={String(s)}
              icon={stroke === s ? Icon.Checkmark : Icon.Dot}
              onAction={() => setStroke(s)}
            />
          ))}
        </ActionPanel.Submenu>
      ) : (
        <ActionPanel.Submenu title="Weight" icon={Icon.LineChart}>
          {WEIGHTS.map((w) => (
            <Action
              key={w}
              title={String(w)}
              icon={weight === w ? Icon.Checkmark : Icon.Dot}
              onAction={() => setWeight(w)}
            />
          ))}
        </ActionPanel.Submenu>
      )}

      {!isLucide && (
        <Action
          title={
            fill ? "Switch to Outline (FILL 0)" : "Switch to Filled (FILL 1)"
          }
          icon={Icon.CircleFilled}
          shortcut={{ modifiers: ["cmd"], key: "f" }}
          onAction={() => setFill(!fill)}
        />
      )}
      <Action
        title={isLucide ? "Increase Stroke" : "Increase Weight"}
        icon={Icon.Plus}
        shortcut={{ modifiers: ["cmd"], key: "]" }}
        onAction={() => (isLucide ? cycleStroke(1) : cycleWeight(1))}
      />
      <Action
        title={isLucide ? "Decrease Stroke" : "Decrease Weight"}
        icon={Icon.Minus}
        shortcut={{ modifiers: ["cmd"], key: "[" }}
        onAction={() => (isLucide ? cycleStroke(-1) : cycleWeight(-1))}
      />

      <ActionPanel.Submenu
        title="Filter by Category"
        icon={Icon.Filter}
        shortcut={{ modifiers: ["cmd", "shift"], key: "l" }}
      >
        <Action
          title="All"
          icon={category === "" ? Icon.Checkmark : Icon.Dot}
          onAction={() => setCategory("")}
        />
        {categoriesList.map((c) => (
          <Action
            key={c}
            title={c}
            icon={category === c ? Icon.Checkmark : Icon.Dot}
            onAction={() => setCategory(c)}
          />
        ))}
      </ActionPanel.Submenu>
    </ActionPanel.Section>
  );

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Large}
      filtering={false}
      throttle
      isLoading={loading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder={`Search ${pool.length || ""} ${isLucide ? "Lucide" : "Material Symbols"} icons…`}
      pagination={{
        pageSize: PAGE_SIZE,
        hasMore,
        onLoadMore: () => setPage((p) => p + 1),
      }}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Icon Set / Style"
          value={variant}
          onChange={setVariant}
        >
          <Grid.Dropdown.Section title="Material Symbols">
            <Grid.Dropdown.Item title="Outlined" value="ms:outlined" />
            <Grid.Dropdown.Item title="Rounded" value="ms:rounded" />
            <Grid.Dropdown.Item title="Sharp" value="ms:sharp" />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Lucide">
            <Grid.Dropdown.Item title="Lucide" value="lucide" />
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      {!loading && sections.every((s) => s.items.length === 0) ? (
        <Grid.EmptyView
          title={
            isLucide && pool.length === 0 ? "No Lucide Data" : "No Results"
          }
          description={
            isLucide && pool.length === 0
              ? "Generate assets/lucide.json"
              : "Try another keyword"
          }
          icon={Icon.MagnifyingGlass}
        />
      ) : (
        sections.map((section) => (
          <Grid.Section key={section.title} title={section.title}>
            {section.items.map((entry) => {
              const displaySvg = makeSvg(entry, previewColor, 24);
              if (!displaySvg) return null;
              const copySvg = makeSvg(entry, color, size) ?? displaySvg;

              const renderPng = () =>
                writePngFile(
                  makeSvg(entry, pngColor, size) ?? copySvg,
                  pngWidth,
                  entry.name,
                );
              const copyImage = async () => {
                const toast = await showToast({
                  style: Toast.Style.Animated,
                  title: "Rendering image…",
                });
                const file = await renderPng();
                await Clipboard.copy({ file });
                markUsed(entry.name);
                toast.style = Toast.Style.Success;
                toast.title = `Copied image: ${entry.name}`;
              };
              const pasteImage = async () => {
                const file = await renderPng();
                markUsed(entry.name);
                await Clipboard.paste({ file });
              };
              const copyText = async (text: string, label: string) => {
                await Clipboard.copy(text);
                markUsed(entry.name);
                await showToast({ style: Toast.Style.Success, title: label });
              };
              const reactComponent = () =>
                isLucide
                  ? toLucideComponent(entry.name, (entry as LucideEntry).inner)
                  : (() => {
                      const d = getCleanPath(
                        style,
                        axes,
                        (entry as SymbolEntry).codePoint,
                      );
                      return d ? toReactComponent(entry.name, d) : null;
                    })();
              const pathSnippet = () =>
                isLucide
                  ? (entry as LucideEntry).inner
                  : getCleanPath(style, axes, (entry as SymbolEntry).codePoint);

              const mainActions: Record<PrimaryAction, ReactElement> = {
                "paste-png": (
                  <Action
                    key="paste-png"
                    title="Paste as Image (PNG)"
                    icon={Icon.Image}
                    shortcut={{ modifiers: ["cmd", "opt"], key: "v" }}
                    onAction={pasteImage}
                  />
                ),
                "copy-png": (
                  <Action
                    key="copy-png"
                    title="Copy Image (PNG)"
                    icon={Icon.Image}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
                    onAction={copyImage}
                  />
                ),
                "copy-svg": (
                  <Action.CopyToClipboard
                    key="copy-svg"
                    title="Copy SVG Code"
                    icon={Icon.Code}
                    content={copySvg}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                    onCopy={() => markUsed(entry.name)}
                  />
                ),
                "paste-svg": (
                  <Action.Paste
                    key="paste-svg"
                    title="Paste SVG"
                    icon={Icon.Document}
                    content={copySvg}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "v" }}
                    onPaste={() => markUsed(entry.name)}
                  />
                ),
              };
              const primaryOrder: PrimaryAction[] = [
                prefs.primaryAction,
                ...PRIMARY_KEYS.filter((k) => k !== prefs.primaryAction),
              ];
              const favored = isFav(entry.name);

              return (
                <Grid.Item
                  key={entry.name}
                  title={favored ? `★ ${entry.name}` : entry.name}
                  content={{
                    value: {
                      source: svgToDataUri(displaySvg),
                      tintColor: displayTint,
                    },
                    tooltip: entry.name,
                  }}
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        {primaryOrder.map((k) => mainActions[k])}
                      </ActionPanel.Section>

                      <ActionPanel.Section title="Other Formats">
                        <Action
                          title="Copy React Component"
                          icon={Icon.Code}
                          shortcut={{ modifiers: ["cmd"], key: "j" }}
                          onAction={() => {
                            const c = reactComponent();
                            if (c) copyText(c, "Copied React component");
                          }}
                        />
                        <Action
                          title={
                            isLucide ? "Copy SVG Markup" : "Copy SVG Path (d)"
                          }
                          icon={Icon.Code}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                          onAction={() => {
                            const p = pathSnippet();
                            if (p)
                              copyText(
                                p,
                                isLucide
                                  ? "Copied SVG markup"
                                  : "Copied SVG path",
                              );
                          }}
                        />
                        <Action
                          title="Copy SVG (currentColor)"
                          icon={Icon.Code}
                          shortcut={{ modifiers: ["cmd"], key: "u" }}
                          onAction={() => {
                            const svg = makeSvg(entry, "currentColor", size);
                            if (svg) copyText(svg, "Copied SVG (currentColor)");
                          }}
                        />
                        <Action
                          title="Copy Data URI"
                          icon={Icon.Link}
                          shortcut={{ modifiers: ["cmd"], key: "d" }}
                          onAction={() =>
                            copyText(svgToDataUri(copySvg), "Copied data URI")
                          }
                        />
                        <Action.CopyToClipboard
                          title="Copy Icon Name"
                          icon={Icon.Text}
                          content={entry.name}
                          shortcut={{ modifiers: ["cmd"], key: "." }}
                          onCopy={() => markUsed(entry.name)}
                        />
                      </ActionPanel.Section>

                      {appearanceSection}

                      <ActionPanel.Section>
                        <Action
                          title={
                            favored
                              ? "Remove from Favorites"
                              : "Add to Favorites"
                          }
                          icon={favored ? Icon.StarDisabled : Icon.Star}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                          onAction={() => toggleFavorite(entry.name)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </Grid.Section>
        ))
      )}
    </Grid>
  );
}
