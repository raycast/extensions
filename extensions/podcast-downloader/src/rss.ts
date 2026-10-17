import { XMLParser } from "fast-xml-parser";
import { safeFetch } from "./network";
import type { Episode, Podcast } from "./types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
});
const array = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = (value: unknown): string | undefined => {
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (value && typeof value === "object" && "#text" in value)
    return String((value as Record<string, unknown>)["#text"]);
  return undefined;
};

export async function parseFeed(
  url: string,
): Promise<{ podcast: Podcast; episodes: Episode[] }> {
  const response = await safeFetch(url, {
    headers: { "User-Agent": "Raycast-Podcast-Downloader/1.0" },
  });
  if (!response.ok)
    throw new Error(
      `RSS feed returned ${response.status}: ${response.statusText}`,
    );
  const channel = parser.parse(await response.text())?.rss?.channel;
  if (!channel)
    throw new Error("This URL does not contain a valid RSS podcast channel.");
  const podcast: Podcast = {
    id: url,
    title: text(channel.title) ?? "RSS Podcast",
    author: text(channel["itunes:author"]),
    description: text(channel.description),
    image: channel["itunes:image"]?.["@_href"] ?? text(channel.image?.url),
    url,
  };
  const episodes = array<Record<string, unknown>>(channel.item)
    .map((item, index) => {
      const enclosure = item.enclosure as Record<string, unknown> | undefined;
      const pubDate = text(item.pubDate);
      return {
        id: text(item.guid) ?? `${url}#${index}`,
        title: text(item.title) ?? "Untitled Episode",
        description: text(item["content:encoded"]) ?? text(item.description),
        datePublished: pubDate
          ? Math.floor(new Date(pubDate).getTime() / 1000)
          : undefined,
        duration: parseDuration(text(item["itunes:duration"])),
        enclosureUrl: String(enclosure?.["@_url"] ?? ""),
        enclosureType: enclosure?.["@_type"]
          ? String(enclosure["@_type"])
          : undefined,
        feedTitle: podcast.title,
      };
    })
    .filter((episode) => episode.enclosureUrl);
  return { podcast, episodes };
}

function parseDuration(value?: string): number | undefined {
  if (!value) return undefined;
  const parts = value.split(":").map(Number);
  if (parts.some(Number.isNaN)) return undefined;
  return parts.reduce((total, part) => total * 60 + part, 0);
}
