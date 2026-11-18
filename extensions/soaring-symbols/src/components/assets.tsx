import { Action, ActionPanel, Clipboard, Grid, Icon, Color, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import type { Airline, Alliance } from "soaring-symbols";
import { allianceTiles, type AssetTile, earlierMarks, getAssetTiles, markTitle } from "../utils/airlines";
import { getSVGContent } from "../utils/fetch";

const slugToName = (slug: string): string => {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const isProbablySvg = (text: string): boolean => {
  const t = text.trim();
  return t.startsWith("<svg") && t.endsWith("</svg>");
};

const getDownloadsDir = (): string => {
  const home = process.env.HOME || process.env.USERPROFILE || "";
  return path.join(home, "Downloads");
};

// A grid of SVG tiles, each with copy and download actions: the current
// marks, then any older ones in a section each
function MarkGrid({
  navigationTitle,
  sections,
}: {
  navigationTitle: string;
  sections: { key: string; title: string; tiles: AssetTile[] }[];
}) {
  const renderTile = ({ variant, url: source, fileName, mono }: AssetTile) => {
    const tintColor = mono ? Color.PrimaryText : undefined;

    return (
      <Grid.Item
        key={source}
        content={{ source, tintColor }}
        title={slugToName(variant)}
        actions={
          <ActionPanel>
            <ActionPanel.Section title="SVG Actions">
              <Action
                title="Copy SVG"
                icon={Icon.CopyClipboard}
                onAction={async () => {
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
                }}
              />
              <Action
                title="Download SVG…"
                icon={Icon.Download}
                onAction={async () => {
                  try {
                    const svg = await getSVGContent(source);
                    const downloadsDir = getDownloadsDir();
                    const filePath = path.join(downloadsDir, fileName);

                    // Validate basic SVG structure before writing
                    if (!isProbablySvg(svg)) {
                      await showToast({ style: Toast.Style.Failure, title: "Invalid SVG content" });
                      return;
                    }

                    fs.writeFileSync(filePath, svg, { encoding: "utf-8" });
                    await showToast({
                      style: Toast.Style.Success,
                      title: "SVG downloaded",
                      message: filePath,
                    });
                  } catch (err) {
                    await showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to save SVG",
                      message: (err as Error)?.message ?? "Unknown error",
                    });
                  }
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  };

  // With older marks, the current ones get a section of their own above them;
  // without, the grid stays a plain list of tiles
  const children =
    sections.length > 1
      ? sections.map((section) => (
          <Grid.Section key={section.key} title={section.title}>
            {section.tiles.map(renderTile)}
          </Grid.Section>
        ))
      : (sections[0]?.tiles ?? []).map(renderTile);

  return <Grid columns={4} inset={Grid.Inset.Small} throttle navigationTitle={navigationTitle} children={children} />;
}

export default function AirlineAssets(airline: Airline) {
  // Older marks newest first, below the current ones
  const sections = [
    { key: "current", title: "Current", tiles: getAssetTiles(airline) },
    ...earlierMarks(airline).map((mark) => ({
      key: String(mark.since),
      title: markTitle(airline, mark),
      tiles: getAssetTiles(airline, mark),
    })),
  ];

  return <MarkGrid navigationTitle={`${airline.name} | Assets`} sections={sections} />;
}

export function AllianceAssets(alliance: Alliance) {
  return (
    <MarkGrid
      navigationTitle={`${alliance.name} | Assets`}
      sections={[{ key: "current", title: "Current", tiles: allianceTiles(alliance) }]}
    />
  );
}
