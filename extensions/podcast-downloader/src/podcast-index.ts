import crypto from "node:crypto";
import { getPreferenceValues } from "@raycast/api";
import type { Episode, Podcast } from "./types";

const API = "https://api.podcastindex.org/api/1.0";

function headers(): Record<string, string> {
  const { podcastIndexApiKey: key, podcastIndexApiSecret: secret } =
    getPreferenceValues<Preferences>();
  if (!key || !secret)
    throw new Error(
      "Add Podcast Index credentials in the extension preferences, or open a direct RSS URL.",
    );
  const date = Math.floor(Date.now() / 1000).toString();
  return {
    "User-Agent": "Raycast-Podcast-Downloader/1.0",
    "X-Auth-Key": key,
    "X-Auth-Date": date,
    Authorization: crypto
      .createHash("sha1")
      .update(key + secret + date)
      .digest("hex"),
  };
}

async function request<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const url = new URL(`${API}${path}`);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value),
  );
  const response = await fetch(url, { headers: headers() });
  if (!response.ok)
    throw new Error(
      `Podcast Index returned ${response.status}: ${response.statusText}`,
    );
  return (await response.json()) as T;
}

export function hasCredentials(): boolean {
  const values = getPreferenceValues<Preferences>();
  return Boolean(values.podcastIndexApiKey && values.podcastIndexApiSecret);
}

export async function searchPodcasts(query: string): Promise<Podcast[]> {
  const data = await request<{ feeds?: Record<string, unknown>[] }>(
    "/search/byterm",
    { q: query, max: "30", clean: "1" },
  );
  return (data.feeds ?? []).map((feed) => ({
    id: Number(feed.id),
    title: String(feed.title ?? "Untitled Podcast"),
    author: typeof feed.author === "string" ? feed.author : undefined,
    description:
      typeof feed.description === "string" ? feed.description : undefined,
    image: String(feed.artwork || feed.image || "") || undefined,
    url: String(feed.url ?? ""),
    episodeCount:
      typeof feed.episodeCount === "number" ? feed.episodeCount : undefined,
  }));
}

export async function getEpisodes(
  feedId: number | string,
  max = 100,
): Promise<Episode[]> {
  const data = await request<{ items?: Record<string, unknown>[] }>(
    "/episodes/byfeedid",
    {
      id: String(feedId),
      max: String(max),
      fulltext: "1",
    },
  );
  return (data.items ?? [])
    .filter((item) => item.enclosureUrl)
    .map((item) => ({
      id: Number(item.id),
      title: String(item.title ?? "Untitled Episode"),
      description:
        typeof item.description === "string" ? item.description : undefined,
      datePublished:
        typeof item.datePublished === "number" ? item.datePublished : undefined,
      duration: typeof item.duration === "number" ? item.duration : undefined,
      enclosureUrl: String(item.enclosureUrl),
      enclosureType:
        typeof item.enclosureType === "string" ? item.enclosureType : undefined,
      feedTitle:
        typeof item.feedTitle === "string" ? item.feedTitle : undefined,
    }));
}
