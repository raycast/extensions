import { Action, ActionPanel, Clipboard, Grid, Icon, Color, environment, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import type { Airline, Alliance } from "soaring-symbols";
import {
  allianceTiles,
  type AssetTile,
  earlierMarks,
  getAssetTiles,
  markTitle,
  tileKind,
  typeSections,
} from "../utils/airlines";
import { useState } from "react";
import { getSVGContent } from "../utils/fetch";

// "logo-mono" → "Logo Mono", and the vertical lockup as "Stacked Logo"
const isProbablySvg = (text: string): boolean => {
  const t = text.trim();
  return t.startsWith("<svg") && t.endsWith("</svg>");
};

const getDownloadsDir = (): string => {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path.join(home, "Downloads");
};

const copySvg = async (source: string) => {
  try {
    const svg = await getSVGContent(source);
    await Clipboard.copy(svg);
    await showToast({ style: Toast.Style.Success, title: "SVG copied to clipboard" });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy SVG",
      message: (err as Error)?.message ?? "Unknown error",
    });
  }
};

const downloadSvg = async (source: string, fileName: string) => {
  try {
    const svg = await getSVGContent(source);
    const filePath = path.join(getDownloadsDir(), fileName);

    // Validate basic SVG structure before writing
    if (!isProbablySvg(svg)) {
      await showToast({ style: Toast.Style.Failure, title: "Invalid SVG content" });
      return;
    }

    fs.writeFileSync(filePath, svg, { encoding: "utf-8" });
    await showToast({ style: Toast.Style.Success, title: "SVG downloaded", message: filePath });
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to save SVG",
      message: (err as Error)?.message ?? "Unknown error",
    });
  }
};

// A grid of SVG tiles, each with copy and download actions: the current
// marks, then any older ones in a section each
// One set of marks: the current ones, or an older set from the history
interface MarkSet {
  key: string;
  title: string;
  tiles: AssetTile[];
}

// In dark mode, the -dark.svg files show beside the color and monochrome
// ones, on Raycast's dark background; a white mark would vanish on the light
// one, so there it stays in the color tile's actions only
const showDark = () => environment.appearance === "dark";

// A grid of one set of marks, a section per type (Logo, Logo Stacked, Icon,
// Tail) as on the website, each tile with copy and download actions. With
// older marks, a dropdown in the search bar picks the set.
function MarkGrid({ navigationTitle, sets }: { navigationTitle: string; sets: MarkSet[] }) {
  const [selected, setSelected] = useState(sets[0]?.key);
  const set = sets.find((s) => s.key === selected) ?? sets[0];

  const renderTile = ({ variant, url: source, fileName, mono, dark }: AssetTile) => (
    <Grid.Item
      key={source}
      // Each tile shows its own file, whatever the theme
      content={{ source, tintColor: mono ? Color.PrimaryText : undefined }}
      title={tileKind(variant).title}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="SVG Actions">
            <Action title="Copy SVG" icon={Icon.CopyClipboard} onAction={() => copySvg(source)} />
            <Action title="Download SVG…" icon={Icon.Download} onAction={() => downloadSvg(source, fileName)} />
          </ActionPanel.Section>
          {dark && (
            <ActionPanel.Section title="For Dark Backgrounds">
              <Action title="Copy SVG for Dark Backgrounds" icon={Icon.Moon} onAction={() => copySvg(dark.url)} />
              <Action
                title="Download SVG for Dark Backgrounds…"
                icon={Icon.Download}
                onAction={() => downloadSvg(dark.url, dark.fileName)}
              />
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Small}
      throttle
      navigationTitle={navigationTitle}
      searchBarAccessory={
        sets.length > 1 ? (
          <Grid.Dropdown tooltip="Marks" value={set?.key} onChange={setSelected}>
            {sets.map((s) => (
              <Grid.Dropdown.Item key={s.key} title={s.title} value={s.key} />
            ))}
          </Grid.Dropdown>
        ) : undefined
      }
    >
      {typeSections(set?.tiles ?? [], { dark: showDark() }).map((section) => (
        <Grid.Section key={section.key} title={section.title}>
          {section.tiles.map(renderTile)}
        </Grid.Section>
      ))}
    </Grid>
  );
}

// The current marks first, then the older ones newest first
export default function AirlineAssets(airline: Airline) {
  const sets = [
    { key: "current", title: "Current", tiles: getAssetTiles(airline) },
    ...earlierMarks(airline).map((mark) => ({
      key: String(mark.since),
      title: markTitle(airline, mark),
      tiles: getAssetTiles(airline, mark),
    })),
  ];

  return <MarkGrid navigationTitle={`${airline.name} | Assets`} sets={sets} />;
}

export function AllianceAssets(alliance: Alliance) {
  return (
    <MarkGrid
      navigationTitle={`${alliance.name} | Assets`}
      sets={[{ key: "current", title: "Current", tiles: allianceTiles(alliance) }]}
    />
  );
}
