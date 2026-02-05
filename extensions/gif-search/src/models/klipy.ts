import { formatRelative, fromUnixTime } from "date-fns";

import { APIOpt, IGif, IGifAPI, slugify } from "../models/gif";
import { getKlipyLocale, getKlipyApiKey } from "../preferences";

export interface KlipyResults {
  results: KlipyGif[];
  next: string;
}

export interface KlipyGif {
  created: number;
  hasaudio: boolean;
  id: string;
  media_formats: {
    [format: string]: KlipyMediaFormat;
  };
  tags: string[];
  title: string;
  content_description: string;
  itemurl: string;
  hascaption: boolean;
  flags: string;
  bg_color: string;
  url: string;
}

interface KlipyMediaFormat {
  url: string;
  dims: number[];
  duration: number;
  size: number;
}

const API_BASE_URL = "https://api.klipy.com";

export default async function klipy() {
  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const apiKey = getKlipyApiKey();
      if (!apiKey) {
        throw new Error("Klipy API key is required. Please add it in extension preferences.");
      }

      const reqUrl = new URL(`${API_BASE_URL}/v2/search`);
      reqUrl.searchParams.set("locale", getKlipyLocale());
      reqUrl.searchParams.set("q", term);
      reqUrl.searchParams.set("media_filter", "gif,nanogif,tinygif");
      reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");
      reqUrl.searchParams.set("key", apiKey);

      if (opt?.next) {
        reqUrl.searchParams.set("pos", opt.next);
      }

      const response = await fetch(reqUrl.toString());
      if (!response.ok) {
        throw new Error(`Could not search gifs from Klipy. Status: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error("Empty response from Klipy API");
      }

      const results = JSON.parse(responseText) as KlipyResults;

      return { results: results.results?.map(mapKlipyResponse) ?? [], next: results.next };
    },

    async trending(opt?: APIOpt) {
      const apiKey = getKlipyApiKey();
      if (!apiKey) {
        throw new Error("Klipy API key is required. Please add it in extension preferences.");
      }

      const reqUrl = new URL(`${API_BASE_URL}/v2/featured`);
      reqUrl.searchParams.set("locale", getKlipyLocale());
      reqUrl.searchParams.set("media_filter", "gif,nanogif,tinygif");
      reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");
      reqUrl.searchParams.set("key", apiKey);

      if (opt?.next) {
        reqUrl.searchParams.set("pos", opt.next);
      }

      const response = await fetch(reqUrl.toString());
      if (!response.ok) {
        throw new Error(`Could not get trending gifs from Klipy. Status: ${response.status}`);
      }

      const responseText = await response.text();
      if (!responseText) {
        throw new Error("Empty response from Klipy API");
      }

      const results = JSON.parse(responseText) as KlipyResults;

      return { results: results.results?.map(mapKlipyResponse) ?? [], next: results.next };
    },

    async gifs(ids: string[]) {
      if (!ids.length) {
        return [];
      }

      const apiKey = getKlipyApiKey();
      if (!apiKey) {
        throw new Error("Klipy API key is required. Please add it in extension preferences.");
      }

      // Note: Klipy /v2/gifs endpoint currently returns empty responses
      // GIFs are saved but individual loading requires production access
      return [];
    },
  };
}

export function mapKlipyResponse(response: KlipyGif) {
  const medias = response.media_formats;
  const title = response.title || response.content_description;
  const slug = slugify(title);

  return <IGif>{
    id: response.id,
    title: title,
    url: response.itemurl,
    slug,
    download_url: medias.gif?.url ?? "",
    download_name: `${slug}.gif`,
    small_preview_gif_url: medias.nanogif?.url ?? "",
    large_preview_gif_url: medias.tinygif?.url,
    gif_url: medias.gif?.url ?? "",
    metadata: {
      width: medias.gif?.dims?.[0],
      height: medias.gif?.dims?.[1],
      size: medias.gif?.size,
      labels: [{ title: "Created", text: formatRelative(fromUnixTime(response.created), new Date()) }],
      tags: response.tags,
    },
    attribution: "klipy-logo-square-180.png",
  };
}
