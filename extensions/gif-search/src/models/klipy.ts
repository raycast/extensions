import { formatRelative, fromUnixTime } from "date-fns";

import { APIOpt, createGifLookupUrl, IGif, IGifAPI, slugify } from "../models/gif";
import { getKlipyLocale } from "../preferences";
import { fetchProviderJson } from "../lib/fetchProviderJson";

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

const API_BASE_URL = "https://gif-search.raycast.com/api/klipy";

async function fetchKlipy(url: URL): Promise<KlipyResults> {
  return fetchProviderJson<KlipyResults>(url, { provider: "Klipy", request: "request" });
}

function getKlipyUrl(opt?: APIOpt) {
  const reqUrl = new URL(API_BASE_URL);
  reqUrl.searchParams.set("locale", getKlipyLocale());
  reqUrl.searchParams.set("media_filter", "gif,nanogif,tinygif");
  reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");

  if (opt?.next) {
    reqUrl.searchParams.set("pos", opt.next);
  }

  return reqUrl;
}

function mapKlipyResults(results: KlipyResults) {
  return { results: results.results?.map(mapKlipyResponse) ?? [], next: results.next };
}

export default async function klipy() {
  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const reqUrl = getKlipyUrl(opt);
      reqUrl.searchParams.set("q", term);

      const results = await fetchKlipy(reqUrl);
      return mapKlipyResults(results);
    },

    async trending(opt?: APIOpt) {
      const reqUrl = getKlipyUrl(opt);

      const results = await fetchKlipy(reqUrl);
      return mapKlipyResults(results);
    },

    async gifs(ids: string[]) {
      if (!ids.length) {
        return [];
      }

      const reqUrl = createGifLookupUrl(API_BASE_URL, ids);
      const results = await fetchKlipy(reqUrl);
      return results.results?.map(mapKlipyResponse) ?? [];
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
