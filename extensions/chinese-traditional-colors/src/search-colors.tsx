import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  getPreferenceValues,
  Grid,
  Icon,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { colorSwatchSvg, paletteReferencesCardSvg, paletteSchemeReferences } from "./color-card";
import { traditionalColors } from "./color-data";
import { formatCssHsl, formatCssRgb, formatCssVariable, formatHsl, formatJson, formatRgb } from "./color-format";
import { getColorCopyValue, getCopyFormatLabel, type CopyFormat } from "./copy-format";
import { formatPaletteCssVariables, formatPaletteHexList, formatReference } from "./palette";
import { filterColors, getHueCategories, getSearchKeywords, sortColorsByHueCategory } from "./search";
import type { ColorReference, PaletteKind, TraditionalColor } from "./types";

type ViewMode = "colors" | "palettes" | "favorites" | "recent";

type PaletteScheme = {
  id: string;
  color: TraditionalColor;
  title: string;
  shortTitle: string;
  references: ColorReference[];
};

const favoritesKey = "favorite-color-numbers";
const recentKey = "recent-color-numbers";

const paletteLabels: Record<PaletteKind, string> = {
  similar: "Similar",
  analogous: "Analogous",
  complementary: "Complementary",
  splitComplementary: "Split Complementary",
  triadic: "Triadic",
  tetradic: "Tetradic",
  temperatureContrast: "Warm-Cool Contrast",
  light: "Light Match",
  dark: "Dark Match",
  muted: "Muted Match",
  neutral: "Neutral Match",
  secondary: "Secondary",
  accent: "Accent",
};

const hueCategoryLabels: Record<string, string> = {
  中性色: "Neutral",
  橙色系: "Orange",
  红色系: "Red",
  紫色系: "Purple",
  绿色系: "Green",
  蓝色系: "Blue",
  青色系: "Cyan",
  黄色系: "Yellow",
};

const temperatureLabels: Record<string, string> = {
  冷: "Cool",
  暖: "Warm",
};

function hueCategoryLabel(category: string): string {
  return hueCategoryLabels[category] ?? category;
}

function temperatureLabel(temperature: string): string {
  return temperatureLabels[temperature] ?? temperature;
}

function copyValue(title: string, value: string) {
  return async () => {
    await Clipboard.copy(value);
    await showToast({ style: Toast.Style.Success, title, message: value });
  };
}

async function readStoredNumbers(key: string): Promise<string[]> {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function writeStoredNumbers(key: string, numbers: string[]): Promise<void> {
  await LocalStorage.setItem(key, JSON.stringify(numbers));
}

function paletteMarkdown(title: string, references: ColorReference[], marker = "-"): string {
  if (references.length === 0) return "";
  return `### ${title}\n\n${references.map((reference) => `${marker} ${formatReference(reference)}`).join("\n")}\n`;
}

function paletteOverviewMarkdown(color: TraditionalColor): string {
  const schemes = buildPaletteSchemes(color);

  return `![${color.name}](${paletteReferencesCardSvg(`${color.number} ${color.name}`, paletteSchemeReferences(color))})

# ${color.number} ${color.name}

${color.pinyin}

${schemes
  .map(
    (scheme) => `## ${scheme.shortTitle}

| Name | HEX |
| --- | --- |
${scheme.references.map((reference) => `| ${reference.number} ${reference.name} | \`${reference.hex}\` |`).join("\n")}
`,
  )
  .join("\n")}`;
}

function buildPaletteSchemes(color: TraditionalColor): PaletteScheme[] {
  const mainScheme = paletteSchemeReferences(color);
  const relationshipSchemes = (Object.entries(paletteLabels) as [PaletteKind, string][])
    .map(([kind, label]) => ({
      id: `${color.number}-${kind}`,
      color,
      title: `${color.name} · ${label}`,
      shortTitle: label,
      references: color.palettes[kind],
    }))
    .filter((scheme) => scheme.references.length > 0);

  return [
    {
      id: `${color.number}-main`,
      color,
      title: `${color.name} · Main Scheme`,
      shortTitle: "Main",
      references: mainScheme,
    },
    ...relationshipSchemes,
  ];
}

function colorMarkdown(color: TraditionalColor): string {
  const paletteSections = (Object.entries(paletteLabels) as [PaletteKind, string][])
    .map(([kind, label]) => paletteMarkdown(label, color.palettes[kind]))
    .filter(Boolean)
    .join("\n");

  return `![${color.name}](${colorSwatchSvg(color)})

# ${color.number} ${color.name}

${color.pinyin}

| Format | Value |
| --- | --- |
| HEX | \`${color.hex}\` |
| RGB | \`${formatRgb(color)}\` |
| CSS RGB | \`${formatCssRgb(color)}\` |
| HSL | \`${formatHsl(color)}\` |
| CSS HSL | \`${formatCssHsl(color)}\` |
| CSS Var | \`${formatCssVariable(color)}\` |
| Hue | ${hueCategoryLabel(color.hueCategory)} |
| Temperature | ${temperatureLabel(color.temperature)} |

## Harmony Palettes

${paletteMarkdown("Main", [color.main])}
${paletteMarkdown("Secondary", color.secondary)}
${paletteMarkdown("Accent", color.accent)}
${color.schemeText ? `### Main-Secondary-Accent\n\n${color.schemeText}\n` : ""}
${paletteSections}`;
}

function ColorActions({
  color,
  defaultCopyFormat,
  isFavorite,
  onCopy,
  onToggleFavorite,
  showDetailsAction = true,
}: {
  color: TraditionalColor;
  defaultCopyFormat: CopyFormat;
  isFavorite: boolean;
  onCopy: (color: TraditionalColor) => void;
  onToggleFavorite: (color: TraditionalColor) => void;
  showDetailsAction?: boolean;
}) {
  const fullScheme = [color.main, ...color.secondary, ...color.accent];
  const copyDefault = async () => {
    const value = getColorCopyValue(color, defaultCopyFormat);
    await Clipboard.copy(value);
    onCopy(color);
    await showToast({
      style: Toast.Style.Success,
      title: `Copied ${getCopyFormatLabel(defaultCopyFormat)}`,
      message: value,
    });
  };

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action
          title={`Copy Default Format (${getCopyFormatLabel(defaultCopyFormat)})`}
          icon={Icon.Keyboard}
          onAction={copyDefault}
        />
        {showDetailsAction ? (
          <Action.Push
            title="Show Color Details"
            icon={Icon.Sidebar}
            target={
              <ColorDetail
                color={color}
                defaultCopyFormat={defaultCopyFormat}
                isFavorite={isFavorite}
                onCopy={onCopy}
                onToggleFavorite={onToggleFavorite}
              />
            }
          />
        ) : null}
        <Action
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
          icon={isFavorite ? Icon.StarDisabled : Icon.Star}
          onAction={() => onToggleFavorite(color)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Color">
        <Action
          title="Copy Hex"
          icon={Icon.Clipboard}
          onAction={async () => {
            await copyValue("Copied HEX", color.hex)();
            onCopy(color);
          }}
        />
        <Action
          title="Copy Rgb"
          icon={Icon.Clipboard}
          onAction={async () => {
            await copyValue("Copied RGB", formatRgb(color))();
            onCopy(color);
          }}
        />
        <Action
          title="Copy CSS Rgb"
          icon={Icon.Clipboard}
          onAction={async () => {
            await copyValue("Copied CSS RGB", formatCssRgb(color))();
            onCopy(color);
          }}
        />
        <Action
          title="Copy Hsl"
          icon={Icon.Clipboard}
          onAction={async () => {
            await copyValue("Copied HSL", formatHsl(color))();
            onCopy(color);
          }}
        />
        <Action
          title="Copy CSS Hsl"
          icon={Icon.Clipboard}
          onAction={async () => {
            await copyValue("Copied CSS HSL", formatCssHsl(color))();
            onCopy(color);
          }}
        />
        <Action
          title="Copy CSS Variable"
          icon={Icon.Code}
          onAction={async () => {
            await copyValue("Copied CSS Variable", formatCssVariable(color))();
            onCopy(color);
          }}
        />
        <Action
          title="Copy JSON"
          icon={Icon.Code}
          onAction={async () => {
            await copyValue("Copied JSON", formatJson(color))();
            onCopy(color);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Palette">
        <Action
          title="Copy Main Scheme Hex"
          icon={Icon.CircleProgress}
          onAction={async () => {
            await copyValue("Copied Main Scheme HEX", formatPaletteHexList(fullScheme))();
            onCopy(color);
          }}
        />
        <Action
          title="Copy Main Scheme Variables"
          icon={Icon.Code}
          onAction={async () => {
            await copyValue("Copied Main Scheme CSS", formatPaletteCssVariables("scheme", fullScheme))();
            onCopy(color);
          }}
        />
        {(Object.entries(paletteLabels) as [PaletteKind, string][])
          .filter(([kind]) => color.palettes[kind].length > 0)
          .map(([kind, label]) => (
            <ActionPanel.Submenu key={kind} title={`Copy ${label}`} icon={Icon.CopyClipboard}>
              <Action
                title="Copy Palette Colors"
                onAction={async () => {
                  await copyValue(`Copied ${label} HEX`, formatPaletteHexList(color.palettes[kind]))();
                  onCopy(color);
                }}
              />
              <Action
                title="Copy Palette Variables"
                onAction={async () => {
                  await copyValue(`Copied ${label} CSS`, formatPaletteCssVariables(kind, color.palettes[kind]))();
                  onCopy(color);
                }}
              />
            </ActionPanel.Submenu>
          ))}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function ColorDetail({
  color,
  defaultCopyFormat,
  isFavorite,
  onCopy,
  onToggleFavorite,
}: {
  color: TraditionalColor;
  defaultCopyFormat: CopyFormat;
  isFavorite: boolean;
  onCopy: (color: TraditionalColor) => void;
  onToggleFavorite: (color: TraditionalColor) => void;
}) {
  return (
    <Detail
      markdown={colorMarkdown(color)}
      actions={
        <ColorActions
          color={color}
          defaultCopyFormat={defaultCopyFormat}
          isFavorite={isFavorite}
          onCopy={onCopy}
          onToggleFavorite={onToggleFavorite}
          showDetailsAction={false}
        />
      }
    />
  );
}

function PaletteOverviewActions({
  color,
  onCopy,
}: {
  color: TraditionalColor;
  onCopy: (color: TraditionalColor) => void;
}) {
  const schemes = buildPaletteSchemes(color);

  return (
    <ActionPanel>
      <ActionPanel.Section>
        <Action.Push
          title="Show Palette Details"
          icon={Icon.Sidebar}
          target={<PaletteOverviewDetail color={color} onCopy={onCopy} />}
        />
        <Action
          title="Copy Main Scheme Colors"
          icon={Icon.CopyClipboard}
          onAction={async () => {
            await copyValue("Copied Main Scheme HEX", formatPaletteHexList(paletteSchemeReferences(color)))();
            onCopy(color);
          }}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Copy Palette Groups">
        {schemes.map((scheme) => (
          <ActionPanel.Submenu key={scheme.id} title={scheme.shortTitle} icon={Icon.AppWindowGrid3x3}>
            <Action
              title="Copy Group Colors"
              icon={Icon.CopyClipboard}
              onAction={async () => {
                await copyValue("Copied Palette HEX", formatPaletteHexList(scheme.references))();
                onCopy(color);
              }}
            />
            <Action
              title="Copy Group Variables"
              icon={Icon.Code}
              onAction={async () => {
                await copyValue("Copied Palette CSS", formatPaletteCssVariables(scheme.id, scheme.references))();
                onCopy(color);
              }}
            />
            {scheme.references.map((reference) => (
              <Action
                key={`${scheme.id}-${reference.number}`}
                title={`Copy ${reference.name} ${reference.hex}`}
                icon={Icon.Clipboard}
                onAction={async () => {
                  await copyValue(`Copied ${reference.name}`, reference.hex)();
                  onCopy(color);
                }}
              />
            ))}
          </ActionPanel.Submenu>
        ))}
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function PaletteOverviewDetail({
  color,
  onCopy,
}: {
  color: TraditionalColor;
  onCopy: (color: TraditionalColor) => void;
}) {
  return (
    <Detail
      markdown={paletteOverviewMarkdown(color)}
      actions={<PaletteOverviewActions color={color} onCopy={onCopy} />}
    />
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("colors");
  const [hueCategory, setHueCategory] = useState("all");
  const [favoriteNumbers, setFavoriteNumbers] = useState<string[]>([]);
  const [recentNumbers, setRecentNumbers] = useState<string[]>([]);
  const preferences = getPreferenceValues<Preferences.SearchColors>();
  const defaultCopyFormat = preferences.defaultCopyFormat ?? "hex";
  const hueCategories = useMemo(() => getHueCategories(traditionalColors), []);
  const favoriteNumberSet = useMemo(() => new Set(favoriteNumbers), [favoriteNumbers]);
  const orderedTraditionalColors = useMemo(() => sortColorsByHueCategory(traditionalColors), []);
  const colorsByNumber = useMemo(
    () => new Map(orderedTraditionalColors.map((color) => [color.number, color] as const)),
    [orderedTraditionalColors],
  );
  const sourceColors = useMemo(() => {
    if (viewMode === "favorites") {
      return favoriteNumbers
        .map((number) => colorsByNumber.get(number))
        .filter((color): color is TraditionalColor => !!color);
    }

    if (viewMode === "recent") {
      return recentNumbers
        .map((number) => colorsByNumber.get(number))
        .filter((color): color is TraditionalColor => !!color);
    }

    return orderedTraditionalColors;
  }, [colorsByNumber, favoriteNumbers, orderedTraditionalColors, recentNumbers, viewMode]);
  const colors = useMemo(() => {
    const filteredColors = filterColors(sourceColors, searchText, hueCategory);
    return viewMode === "colors" || viewMode === "palettes" ? sortColorsByHueCategory(filteredColors) : filteredColors;
  }, [sourceColors, searchText, hueCategory, viewMode]);

  useEffect(() => {
    async function loadStoredLists() {
      setFavoriteNumbers(await readStoredNumbers(favoritesKey));
      setRecentNumbers(await readStoredNumbers(recentKey));
    }

    loadStoredLists();
  }, []);

  async function toggleFavorite(color: TraditionalColor) {
    const next = favoriteNumberSet.has(color.number)
      ? favoriteNumbers.filter((number) => number !== color.number)
      : [color.number, ...favoriteNumbers];

    setFavoriteNumbers(next);
    await writeStoredNumbers(favoritesKey, next);
    await showToast({
      style: Toast.Style.Success,
      title: favoriteNumberSet.has(color.number) ? "Removed from Favorites" : "Added to Favorites",
      message: `${color.number} ${color.name}`,
    });
  }

  async function rememberCopiedColor(color: TraditionalColor) {
    const next = [color.number, ...recentNumbers.filter((number) => number !== color.number)].slice(0, 30);
    setRecentNumbers(next);
    await writeStoredNumbers(recentKey, next);
  }

  function handleAccessoryChange(value: string) {
    if (value.startsWith("mode:")) {
      setViewMode(value.replace("mode:", "") as ViewMode);
      return;
    }

    if (value.startsWith("hue:")) {
      setHueCategory(value.replace("hue:", ""));
    }
  }

  const accessoryValue = viewMode === "colors" || viewMode === "palettes" ? `hue:${hueCategory}` : `mode:${viewMode}`;
  const isPaletteMode = viewMode === "palettes";

  return (
    <Grid
      columns={5}
      aspectRatio="1"
      inset={Grid.Inset.Zero}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search..."
      searchBarAccessory={
        <Grid.Dropdown tooltip="View and Hue" value={accessoryValue} onChange={handleAccessoryChange}>
          <Grid.Dropdown.Section title="View">
            <Grid.Dropdown.Item title="Colors" value="mode:colors" icon={Icon.Circle} />
            <Grid.Dropdown.Item title="Palettes" value="mode:palettes" icon={Icon.AppWindowGrid3x3} />
            <Grid.Dropdown.Item title="Favorites" value="mode:favorites" icon={Icon.Star} />
            <Grid.Dropdown.Item title="Recent" value="mode:recent" icon={Icon.Clock} />
          </Grid.Dropdown.Section>
          <Grid.Dropdown.Section title="Hue">
            <Grid.Dropdown.Item title="All" value="hue:all" icon={Icon.CircleEllipsis} />
            {hueCategories.map((category) => (
              <Grid.Dropdown.Item
                key={category}
                title={hueCategoryLabel(category)}
                value={`hue:${category}`}
                icon={Icon.Circle}
              />
            ))}
          </Grid.Dropdown.Section>
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView title="No Colors Found" description="Try a different search term" />
      {isPaletteMode
        ? colors.map((color) => (
            <Grid.Item
              key={color.number}
              title={color.name}
              subtitle={paletteSchemeReferences(color)
                .map((reference) => reference.hex)
                .join(" ")}
              keywords={getSearchKeywords(color)}
              content={paletteReferencesCardSvg(`${color.number} ${color.name}`, paletteSchemeReferences(color))}
              actions={<PaletteOverviewActions color={color} onCopy={rememberCopiedColor} />}
            />
          ))
        : colors.map((color) => (
            <Grid.Item
              key={color.number}
              title={color.name}
              subtitle={`${color.hex} · ${color.pinyin}`}
              keywords={getSearchKeywords(color)}
              content={{ color: { light: color.hex, dark: color.hex, adjustContrast: false } }}
              actions={
                <ColorActions
                  color={color}
                  defaultCopyFormat={defaultCopyFormat}
                  isFavorite={favoriteNumberSet.has(color.number)}
                  onCopy={rememberCopiedColor}
                  onToggleFavorite={toggleFavorite}
                />
              }
            />
          ))}
    </Grid>
  );
}
