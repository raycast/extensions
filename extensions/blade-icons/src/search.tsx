import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  environment,
  getPreferenceValues,
  Grid,
  Icon,
  Keyboard,
  showHUD,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";
import { useMemo, useRef, useState } from "react";
import { execFile } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import allSets from "./sets.json";

const execFileAsync = promisify(execFile);

const BASE_URL = "https://blade-ui-kit.com/blade-icons";

interface IconSet {
  id: number;
  name: string;
  count: number;
  prefix: string;
  package: string;
  styles: string[];
  github: string;
}

interface BladeIcon {
  name: string;
  svg: string;
}

type IconStyle = "outline" | "solid" | "color";
type StyleFilter = "all" | IconStyle | "monochrome";

const STYLE_FILTERS: { value: StyleFilter; title: string; icon: Icon }[] = [
  { value: "all", title: "All Styles", icon: Icon.CircleDisabled },
  { value: "outline", title: "Outline", icon: Icon.Circle },
  { value: "solid", title: "Solid", icon: Icon.CircleFilled },
  { value: "monochrome", title: "Monochrome", icon: Icon.CircleProgress50 },
  { value: "color", title: "Color", icon: Icon.EyeDropper },
];

// Style markers can sit anywhere in the name, often only at the very end
// (fluentui-clipboard-text-edit-24-o, mdi-mouse-outline), so match whole
// dash-separated tokens rather than substrings.
// Keep in sync with detectStyle() in scripts/scrape-sets.mjs.
const OUTLINE_TOKENS = new Set([
  "outline",
  "outlined",
  "linear",
  "line",
  "broken",
  "thin",
  "light",
  "regular",
  "o",
]);
const SOLID_TOKENS = new Set([
  "fill",
  "filled",
  "solid",
  "bold",
  "duotone",
  "s",
  "f",
]);

// The site lists one set twice (Untitledui Icons: ids 74 and 78 serve
// identical icons from the same package). Keep one entry per name, merging the
// sampled styles so no style coverage is lost to sampling variance.
const sets: IconSet[] = [
  ...(allSets as IconSet[])
    .reduce((byName, set) => {
      const existing = byName.get(set.name);
      if (existing)
        existing.styles = [
          ...new Set([...existing.styles, ...set.styles]),
        ].sort();
      else byName.set(set.name, { ...set });
      return byName;
    }, new Map<string, IconSet>())
    .values(),
];
const totalCount = sets.reduce((sum, set) => sum + set.count, 0);

function parseIcons(html: string): BladeIcon[] {
  const icons: BladeIcon[] = [];
  const seen = new Set<string>();
  // Each result is wrapped in a container carrying wire:key="result_…"
  for (const block of html.split(/wire:key="result_\d+"/).slice(1)) {
    const match = block.match(
      /href="https:\/\/blade-ui-kit\.com\/blade-icons\/([a-z0-9-]+)"[\s\S]*?(<svg[\s\S]*?<\/svg>)/,
    );
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      icons.push({ name: match[1], svg: match[2] });
    }
  }
  return icons;
}

// Ignore invisible plumbing: clipPaths in <defs> often carry a white rect
// (e.g. Akar brand icons) that would otherwise read as a color icon.
function visiblePaint(svg: string): string {
  return svg
    .replace(/<defs>[\s\S]*?<\/defs>/gi, "")
    .replace(/\s*clip-path="[^"]*"/gi, "");
}

// All paint values in the SVG, from fill="…"/stroke="…" attributes AND from
// CSS declarations (style="fill:#…" attributes or <style> blocks — Emojis
// paint exclusively via style attributes).
function paintValues(svg: string): string[] {
  const visible = visiblePaint(svg);
  return [
    ...[...visible.matchAll(/(?:fill|stroke)="([^"]+)"/gi)].map((m) => m[1]),
    ...[...visible.matchAll(/(?:fill|stroke)\s*:\s*([^;"'}]+)/gi)].map(
      (m) => m[1],
    ),
  ].map((value) => value.trim().toLowerCase());
}

const NEUTRAL_PAINTS = new Set([
  "none",
  "currentcolor",
  "transparent",
  "inherit",
]);
// Only real hues count as "Color" — white/black knockouts (Game Icons,
// Cryptocurrency Icons) are still monochrome designs.
const MONO_PAINTS = new Set([
  ...NEUTRAL_PAINTS,
  "white",
  "black",
  "#fff",
  "#ffffff",
  "#000",
  "#000000",
]);

// Any explicit paint at all (white included) makes tinting unsafe: tinting a
// currentColor shape with a white knockout glyph flattens it to a solid square.
function hasExplicitColor(svg: string): boolean {
  return paintValues(svg).some((value) => !NEUTRAL_PAINTS.has(value));
}

function hasRealColor(svg: string): boolean {
  return paintValues(svg).some((value) => !MONO_PAINTS.has(value));
}

// Sets that draw their outline style as filled paths, so the SVG fallback
// can't tell: default variant is outline, a "fill" token marks the solid one
// (bi-alarm vs bi-alarm-fill). Boxicons Regular (bx) is outline-only.
const FILL_PAIRED_PREFIXES = new Set(["bi", "phosphor"]);
const OUTLINE_ONLY_PREFIXES = new Set(["bx"]);

function detectStyle(icon: BladeIcon): IconStyle {
  if (hasRealColor(icon.svg)) {
    return "color";
  }
  const tokens = icon.name.split("-");
  if (OUTLINE_ONLY_PREFIXES.has(tokens[0])) {
    return "outline";
  }
  if (FILL_PAIRED_PREFIXES.has(tokens[0])) {
    return tokens.some((token) => SOLID_TOKENS.has(token))
      ? "solid"
      : "outline";
  }
  if (tokens.some((token) => OUTLINE_TOKENS.has(token))) {
    return "outline";
  }
  if (tokens.some((token) => SOLID_TOKENS.has(token))) {
    return "solid";
  }
  // Fall back to how the SVG is drawn
  if (
    icon.svg.includes('fill="none"') ||
    /stroke="currentColor"/.test(icon.svg)
  ) {
    return "outline";
  }
  return "solid";
}

function matchesStyle(style: IconStyle, filter: StyleFilter): boolean {
  if (filter === "all") return true;
  if (filter === "monochrome") return style !== "color";
  return style === filter;
}

function styleLetters(set: IconSet): string {
  return ["solid", "outline", "color"]
    .filter((style) => set.styles.includes(style))
    .map((style) => style[0])
    .join(",");
}

function cleanSvg(svg: string): string {
  let result = svg.replace(/\s*class="[^"]*"/, "");
  if (!result.includes("xmlns=")) {
    result = result.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return result;
}

function svgDataUri(svg: string): string {
  let result = cleanSvg(svg);
  // The site strips explicit sizes; give Raycast something to rasterize.
  if (!/\bwidth=/.test(result)) {
    result = result.replace("<svg", '<svg width="64" height="64"');
  }
  // Raycast's image renderer doesn't reliably resolve currentColor in data
  // URIs — bake in black; tinting recolors monochrome icons anyway.
  result = result.replaceAll("currentColor", "#000000");
  return "data:image/svg+xml," + encodeURIComponent(result);
}

const SVG2PNG_JXA = `ObjC.import("AppKit");
function run(argv) {
  const inPath = argv[0], outPath = argv[1];
  const w = parseInt(argv[2], 10), h = parseInt(argv[3], 10);
  const img = $.NSImage.alloc.initWithContentsOfFile(inPath);
  if (img.isNil()) return "ERROR: could not load svg";
  const rep = $.NSBitmapImageRep.alloc.initWithBitmapDataPlanesPixelsWidePixelsHighBitsPerSampleSamplesPerPixelHasAlphaIsPlanarColorSpaceNameBytesPerRowBitsPerPixel(
    null, w, h, 8, 4, true, false, $.NSCalibratedRGBColorSpace, 0, 0);
  $.NSGraphicsContext.saveGraphicsState;
  $.NSGraphicsContext.setCurrentContext($.NSGraphicsContext.graphicsContextWithBitmapImageRep(rep));
  img.drawInRectFromRectOperationFraction($.NSMakeRect(0, 0, w, h), $.NSZeroRect, $.NSCompositingOperationSourceOver, 1.0);
  $.NSGraphicsContext.restoreGraphicsState;
  const data = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $.NSDictionary.dictionary);
  data.writeToFileAtomically(outPath, true);
  return "OK";
}`;

const PNG_SIZE = 512;

async function copyAsPng(icon: BladeIcon): Promise<boolean> {
  try {
    const dir = path.join(environment.supportPath, "png");
    await mkdir(dir, { recursive: true });

    let svg = cleanSvg(icon.svg).replaceAll("currentColor", "#000000");
    let width = PNG_SIZE;
    let height = PNG_SIZE;
    const viewBox = svg.match(
      /viewBox="[-\d.]+[ ,]+[-\d.]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/,
    );
    if (viewBox) {
      const vw = parseFloat(viewBox[1]);
      const vh = parseFloat(viewBox[2]);
      if (vw > 0 && vh > 0) {
        if (vw >= vh) height = Math.round((PNG_SIZE * vh) / vw);
        else width = Math.round((PNG_SIZE * vw) / vh);
      }
    }
    if (!/\bwidth=/.test(svg)) {
      svg = svg.replace("<svg", `<svg width="${width}" height="${height}"`);
    }

    const svgPath = path.join(dir, `${icon.name}.svg`);
    const pngPath = path.join(dir, `${icon.name}.png`);
    const scriptPath = path.join(dir, "svg2png.js");
    await writeFile(svgPath, svg);
    await writeFile(scriptPath, SVG2PNG_JXA);
    const { stdout } = await execFileAsync("/usr/bin/osascript", [
      "-l",
      "JavaScript",
      scriptPath,
      svgPath,
      pngPath,
      String(width),
      String(height),
    ]);
    if (stdout.includes("ERROR")) throw new Error(stdout.trim());
    await Clipboard.copy({ file: pngPath });
    await showHUD("Copied PNG to Clipboard");
    return true;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "PNG export failed",
      message: String(error),
    });
    return false;
  }
}

function pascalCase(value: string): string {
  const result = value
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join("");
  return /^\d/.test(result) ? `_${result}` : result;
}

function setForIconName(name: string): IconSet | undefined {
  // Longest matching prefix wins (e.g. "bxs" before "bx")
  return sets
    .filter((s) => name.startsWith(s.prefix + "-"))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
}

/**
 * Enum reference as generated by guava/filament-icons (class = pascal-cased
 * set id, case = pascal-cased icon name without the set prefix). Heroicons map
 * to Filament's built-in Filament\Support\Icons\Heroicon enum instead.
 */
function enumReference(icon: BladeIcon, set: IconSet | undefined): string {
  if (!set) return pascalCase(icon.name);
  const shortName = icon.name.slice(set.prefix.length + 1);
  if (set.name === "Heroicons") {
    const [variant, ...rest] = shortName.split("-");
    const caseName = pascalCase(rest.join("-"));
    return variant === "o"
      ? `Heroicon::Outlined${caseName}`
      : `Heroicon::${caseName}`;
  }
  return `${pascalCase(set.name)}::${pascalCase(shortName)}`;
}

function useSetCopyCounts() {
  const [copyCounts, setCopyCounts] = useCachedState<Record<string, number>>(
    "set-copy-counts",
    {},
  );
  const countsRef = useRef(copyCounts);
  countsRef.current = copyCounts;
  const bump = (set: IconSet | undefined) => {
    if (!set) return;
    setCopyCounts((prev) => ({ ...prev, [set.id]: (prev[set.id] ?? 0) + 1 }));
  };
  return { countsRef, bump };
}

// Stable sort: icons from the sets the user copies from most come first,
// the site's relevance order is kept within each set.
function sortByCopiedSets<T extends { set: IconSet | undefined }>(
  icons: T[],
  counts: Record<string, number>,
): T[] {
  return [...icons].sort(
    (a, b) => (counts[b.set?.id ?? -1] ?? 0) - (counts[a.set?.id ?? -1] ?? 0),
  );
}

function IconGridItem(props: {
  icon: BladeIcon;
  set: IconSet | undefined;
  onCopied?: () => void;
  styleControl?: { value: StyleFilter; onChange: (value: StyleFilter) => void };
}) {
  const { icon, set, onCopied, styleControl } = props;
  const { primaryAction } = getPreferenceValues<Preferences>();
  const activeStyle =
    styleControl && STYLE_FILTERS.find((f) => f.value === styleControl.value);

  const copyActions: {
    id: string;
    title: string;
    content?: string;
    shortcut?: Keyboard.Shortcut;
  }[] = [
    { id: "name", title: "Copy Name", content: icon.name },
    {
      id: "component",
      title: "Copy Component",
      content: `<x-${icon.name} />`,
      shortcut: { modifiers: ["cmd", "shift"], key: "x" },
    },
    {
      id: "directive",
      title: "Copy Directive",
      content: `@svg('${icon.name}')`,
      shortcut: { modifiers: ["cmd", "shift"], key: "d" },
    },
    {
      id: "helper",
      title: "Copy Helper",
      content: `{{ svg('${icon.name}') }}`,
      shortcut: { modifiers: ["cmd", "shift"], key: "h" },
    },
    {
      id: "enum",
      title: "Copy Enum (Guava Icons)",
      content: enumReference(icon, set),
      shortcut: { modifiers: ["cmd", "shift"], key: "e" },
    },
    ...(set
      ? [
          {
            id: "installer",
            title: "Copy Installer Command",
            content: `composer require ${set.package}`,
            shortcut: {
              modifiers: ["cmd", "shift"],
              key: "i",
            } as Keyboard.Shortcut,
          },
        ]
      : []),
    {
      id: "svg",
      title: "Copy SVG",
      content: cleanSvg(icon.svg),
      shortcut: Keyboard.Shortcut.Common.Duplicate,
    },
    {
      id: "svg-source",
      title: "Copy SVG Source",
      content: icon.svg,
      shortcut: { modifiers: ["cmd", "opt"], key: "s" },
    },
    {
      id: "png",
      title: "Copy PNG",
      shortcut: { modifiers: ["cmd", "shift"], key: "p" },
    },
  ];
  const primary =
    copyActions.find((action) => action.id === primaryAction) ?? copyActions[0];
  const ordered = [
    primary,
    ...copyActions.filter((action) => action !== primary),
  ];

  return (
    <Grid.Item
      title={icon.name}
      content={{
        source: svgDataUri(icon.svg),
        // Only tint icons without explicit paints — tinting e.g. game icons
        // (currentColor background + white glyph) would flatten them to a
        // solid square.
        tintColor: hasExplicitColor(icon.svg) ? undefined : Color.PrimaryText,
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section title={icon.name}>
            {ordered.map((action) =>
              action.id === "png" ? (
                <Action
                  key={action.id}
                  title={action.title}
                  icon={Icon.Image}
                  shortcut={action.shortcut}
                  onAction={async () => {
                    if (await copyAsPng(icon)) onCopied?.();
                  }}
                />
              ) : (
                <Action.CopyToClipboard
                  key={action.id}
                  title={action.title}
                  content={action.content!}
                  shortcut={action.shortcut}
                  onCopy={onCopied}
                />
              ),
            )}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.Push
              title="Show Similar Icons"
              icon={Icon.MagnifyingGlass}
              target={<SimilarIcons icon={icon} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action.OpenInBrowser
              title="Open on Blade-Ui-Kit.com"
              url={`${BASE_URL}/${icon.name}`}
              shortcut={Keyboard.Shortcut.Common.Open}
            />
            {set && (
              <Action.OpenInBrowser
                title="Open Icon Set on GitHub"
                icon={Icon.Code}
                url={set.github}
                shortcut={{ modifiers: ["cmd", "shift"], key: "g" }}
              />
            )}
            {styleControl && activeStyle && (
              <ActionPanel.Submenu
                title={`Filter by Style (${activeStyle.title})`}
                icon={activeStyle.icon}
                shortcut={{ modifiers: ["cmd", "shift"], key: "f" }}
              >
                {STYLE_FILTERS.map((filter) => (
                  <Action
                    key={filter.value}
                    title={filter.title}
                    icon={
                      styleControl.value === filter.value
                        ? Icon.CheckCircle
                        : filter.icon
                    }
                    onAction={() => styleControl.onChange(filter.value)}
                  />
                ))}
              </ActionPanel.Submenu>
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SimilarIcons(props: { icon: BladeIcon }) {
  const { countsRef, bump } = useSetCopyCounts();
  const { isLoading, data } = useFetch(`${BASE_URL}/${props.icon.name}`, {
    headers: { "User-Agent": "raycast-blade-icons" },
    parseResponse: async (response) => parseIcons(await response.text()),
    initialData: [] as BladeIcon[],
  });
  const icons = useMemo(
    () =>
      sortByCopiedSets(
        (data ?? [])
          .filter((icon) => icon.name !== props.icon.name)
          .map((icon) => ({ ...icon, set: setForIconName(icon.name) })),
        countsRef.current,
      ),
    // countsRef is a ref on purpose: don't reshuffle the grid on every copy
    [data, props.icon.name],
  );
  return (
    <Grid
      isLoading={isLoading}
      columns={8}
      inset={Grid.Inset.Medium}
      navigationTitle={`Similar to ${props.icon.name}`}
      searchBarPlaceholder="Filter similar icons…"
    >
      <Grid.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Loading…" : "No similar icons found"}
      />
      <Grid.Section
        title={`Similar to ${props.icon.name}`}
        subtitle={`${icons.length} ${icons.length === 1 ? "icon" : "icons"}`}
      >
        {icons.map((icon) => (
          <IconGridItem
            key={icon.name}
            icon={icon}
            set={icon.set}
            onCopied={() => bump(icon.set)}
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

export default function SearchBladeIcons() {
  const [searchText, setSearchText] = useState("");
  const [selectedSetId, setSelectedSetId] = useState<string>("");
  const [cachedFilter, setStyleFilter] = useCachedState<StyleFilter>(
    "style-filter",
    "all",
  );
  const { countsRef, bump } = useSetCopyCounts();
  // Older versions cached values that no longer exist (e.g. "filled")
  const styleFilter = STYLE_FILTERS.some((f) => f.value === cachedFilter)
    ? cachedFilter
    : "all";

  const selectedSet = sets.find((set) => String(set.id) === selectedSetId);

  const url = useMemo(() => {
    const params = new URLSearchParams();
    if (searchText) params.set("search", searchText);
    if (selectedSetId) params.set("selectedSet", selectedSetId);
    const query = params.toString();
    return query ? `${BASE_URL}?${query}` : BASE_URL;
  }, [searchText, selectedSetId]);

  const { isLoading, data } = useFetch(url, {
    headers: { "User-Agent": "raycast-blade-icons" },
    parseResponse: async (response) => parseIcons(await response.text()),
    keepPreviousData: true,
    initialData: [] as BladeIcon[],
  });

  const icons = useMemo(
    () =>
      sortByCopiedSets(
        (data ?? [])
          .map((icon) => ({
            ...icon,
            style: detectStyle(icon),
            set: setForIconName(icon.name),
          }))
          .filter((icon) => matchesStyle(icon.style, styleFilter)),
        countsRef.current,
      ),
    // countsRef is a ref on purpose: don't reshuffle the grid on every copy
    [data, styleFilter],
  );

  const activeStyle = STYLE_FILTERS.find((f) => f.value === styleFilter)!;
  const sectionTitle =
    (selectedSet
      ? `${selectedSet.name} (${selectedSet.count.toLocaleString("en-US")} icons)`
      : "All Icon Sets") +
    (styleFilter === "all" ? "" : ` — ${activeStyle.title} only`);

  return (
    <Grid
      isLoading={isLoading}
      columns={8}
      inset={Grid.Inset.Medium}
      filtering={false}
      throttle
      onSearchTextChange={setSearchText}
      navigationTitle={
        styleFilter === "all"
          ? undefined
          : `Search Blade Icons — ${activeStyle.title}`
      }
      searchBarPlaceholder={
        selectedSet
          ? `Search ${selectedSet.count.toLocaleString("en-US")} ${selectedSet.name} icons…`
          : `Search ${totalCount.toLocaleString("en-US")} Blade icons…`
      }
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Icon Set"
          storeValue
          onChange={setSelectedSetId}
        >
          <Grid.Dropdown.Item
            title={`All Icon Sets (${totalCount.toLocaleString("en-US")})`}
            value=""
          />
          <Grid.Dropdown.Section title="Icon Sets (s = solid, o = outline, c = color)">
            {sets.map((set) => (
              <Grid.Dropdown.Item
                key={set.id}
                title={`${set.name} (${set.count.toLocaleString("en-US")} · ${styleLetters(set)})`}
                value={String(set.id)}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        icon={Icon.MagnifyingGlass}
        title={isLoading ? "Searching…" : "No icons found"}
        description={
          styleFilter === "all"
            ? undefined
            : `Style filter “${activeStyle.title}” is active (⌘⇧F to change)`
        }
      />
      <Grid.Section title={sectionTitle} subtitle={`${icons.length} shown`}>
        {icons.map((icon) => {
          const set = selectedSet ?? icon.set;
          return (
            <IconGridItem
              key={icon.name}
              icon={icon}
              set={set}
              onCopied={() => bump(set)}
              styleControl={{ value: styleFilter, onChange: setStyleFilter }}
            />
          );
        })}
      </Grid.Section>
    </Grid>
  );
}
