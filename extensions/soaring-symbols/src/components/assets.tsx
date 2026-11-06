import { Action, ActionPanel, Clipboard, Grid, Icon, Color, showToast, Toast } from "@raycast/api";
import fs from "fs";
import path from "path";
import type { Airline } from "soaring-symbols";
import { getAssetTiles } from "../utils/airlines";
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

export default function AirlineAssets(airline: Airline) {
  const assets = getAssetTiles(airline).map(({ variant, url: source, mono }) => {
    const tintColor = mono ? Color.PrimaryText : undefined;

    return (
      <Grid.Item
        key={variant}
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
                    const defaultFilename = `${airline.slug}-${variant}.svg`;

                    const downloadsDir = getDownloadsDir();
                    const filePath = path.join(downloadsDir, defaultFilename);

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
  });

  return (
    <Grid
      columns={4}
      inset={Grid.Inset.Small}
      throttle
      navigationTitle={`${airline.name} | Assets`}
      children={assets}
    />
  );
}
