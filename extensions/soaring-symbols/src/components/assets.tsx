import { Action, ActionPanel, Clipboard, Grid, Icon, Color, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import type { Airline } from "soaring-symbols";
import { earlierMarks, getAssetTiles, markTitle } from "../utils/airlines";
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

type Tile = ReturnType<typeof getAssetTiles>[number];

export default function AirlineAssets(airline: Airline) {
  const renderTile = ({ variant, url: source, fileName, mono }: Tile) => {
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

  // With older marks, the current ones get a section of their own above them,
  // newest first; without, the grid stays a plain list of tiles
  const history = earlierMarks(airline);
  const current = getAssetTiles(airline).map(renderTile);
  const children = history.length
    ? [
        <Grid.Section key="current" title="Current">
          {current}
        </Grid.Section>,
        ...history.map((mark) => (
          <Grid.Section key={mark.since} title={markTitle(airline, mark)}>
            {getAssetTiles(airline, mark).map(renderTile)}
          </Grid.Section>
        )),
      ]
    : current;

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Small}
      throttle
      navigationTitle={`${airline.name} | Assets`}
      children={children}
    />
  );
}
