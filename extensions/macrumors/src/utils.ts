import { Image } from "@raycast/api";
import Parser from "rss-parser";

export function getIcon(index: number): Image.ImageLike {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
  <rect x="0" y="0" width="40" height="40" fill="#C01E1F" rx="10"></rect>
  <text
  font-size="22"
  fill="white"
  font-family="San Francisco"
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

export function getPubDate(item: Parser.Item) {
  const pubDate = item.pubDate;
  return pubDate ? pubDate.split(" ").slice(0, 4).join(" ") : undefined;
}
