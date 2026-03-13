import { List, Icon, Image } from "@raycast/api";
import Parser from "rss-parser";
import { isUrlSaved } from "./readwise";

export function getIcon(index: number): Image.ImageLike {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#DD7949" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="Verdana"
  text-anchor="middle"
  alignment-baseline="baseline"
  x="20.5"
  y="32.5">${index}</text>
</svg>
  `.replaceAll("\n", "");

  return {
    source: `data:image/svg+xml,${svg}`,
  };
}

/**
 * Get all accessories for a story item
 *
 * @param item - The story item to get accessories for
 * @param isSaved - Optional parameter to override the saved status check
 * @returns An array of accessories to display
 */
export function getAccessories(item: Parser.Item, isSaved?: boolean): List.Item.Accessory[] {
  const accessories: List.Item.Accessory[] = [];

  // Saved Document
  if ((isSaved !== undefined && isSaved) || (isSaved === undefined && item.link && isUrlSaved(item.link))) {
    accessories.push({ icon: Icon.SaveDocument, tooltip: "Saved to Readwise" });
  }

  // Points
  const points = getPoints(item);
  if (points) {
    accessories.push({ icon: Icon.ArrowUpCircle, text: points });
  }

  // Comments
  const comments = getComments(item);
  if (comments) {
    accessories.push({ icon: Icon.Bubble, text: comments });
  }

  return accessories;
}

function getPoints(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Points:\s*)(\d+)/g);
  return matches?.[0] || null;
}

function getComments(item: Parser.Item) {
  const matches = item.contentSnippet?.match(/(?<=Comments:\s*)(\d+)/g);
  return matches?.[0] || null;
}
