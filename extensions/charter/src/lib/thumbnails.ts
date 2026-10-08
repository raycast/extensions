import { Color, environment, Image } from "@raycast/api";
import { THUMBNAILS } from "../data/thumbnails";
import { familyInfo } from "../data/families";
import type { ChartType, Provider } from "./catalog";

const available = new Set(THUMBNAILS);

export function hasThumbnail(chart: ChartType, provider: Provider): boolean {
  return available.has(`${chart.id}-${provider}`);
}

/** Asset path Raycast resolves against the assets folder; image props pick up the @dark variant themselves. */
export function thumbnailPath(chart: ChartType, provider: Provider): string {
  return `charts/${chart.id}-${provider}.png`;
}

/** Markdown gets no automatic @dark lookup, so the dark file is named outright. */
function markdownThumbnailPath(chart: ChartType, provider: Provider): string {
  return environment.appearance === "dark" ? `charts/${chart.id}-${provider}@dark.png` : thumbnailPath(chart, provider);
}

/** Grid tile: the provider's thumbnail when it exists, otherwise the family icon. */
export function tileContent(chart: ChartType, provider: Provider): Image.ImageLike {
  if (hasThumbnail(chart, provider)) return { source: thumbnailPath(chart, provider) };
  return { source: familyInfo(chart.family).icon, tintColor: Color.SecondaryText };
}

/**
 * Markdown for the detail views: the thumbnail, or nothing when it is missing.
 * The list panel is short, so it asks for a fixed size; the chart page lets
 * Raycast fit the image to the column.
 */
export function thumbnailMarkdown(
  chart: ChartType,
  provider: Provider,
  size?: { width: number; height: number },
): string {
  if (!hasThumbnail(chart, provider)) return "";
  const query = size ? `?raycast-width=${size.width}&raycast-height=${size.height}` : "";
  return `![${chart.name}](${markdownThumbnailPath(chart, provider)}${query})\n\n`;
}
