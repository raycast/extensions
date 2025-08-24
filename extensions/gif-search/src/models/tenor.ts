import { formatRelative, fromUnixTime } from "date-fns";
import fetch from "node-fetch";

import { APIOpt, IGif, IGifAPI, slugify } from "../models/gif";
import { getTenorLocale } from "../preferences";

export interface TenorResults {
  results: TenorGif[];
  next: string;
}

export interface TenorGif {
  created: number;
  hasaudio: boolean;
  id: string;
  media_formats: {
    [format: string]: TenorMediaFormat;
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

interface TenorMediaFormat {
  url: string;
  dims: number[];
  duration: number;
  size: number;
}

const API_BASE_URL = "https://gif-search.raycast.com/api/tenor";

export default async function tenor() {
  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const reqUrl = new URL(API_BASE_URL);
      reqUrl.searchParams.set("locale", getTenorLocale());
      reqUrl.searchParams.set("q", term);
      reqUrl.searchParams.set("media_filter", "gif,nanogif");
      reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");

      if (opt?.next) {
        reqUrl.searchParams.set("pos", opt.next);
      }

      const response = await fetch(reqUrl.toString());
      if (!response.ok) {
        throw new Error("Could not search gifs from Tenor");
      }
      const results = (await response.json()) as TenorResults;

      return { results: results.results?.map(mapTenorResponse) ?? [], next: results.next };
    },

    async trending(opt?: APIOpt) {
      const reqUrl = new URL(API_BASE_URL);
      reqUrl.searchParams.set("locale", getTenorLocale());
      reqUrl.searchParams.set("media_filter", "gif,nanogif");
      reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");

      if (opt?.next) {
        reqUrl.searchParams.set("pos", opt.next);
      }

      const response = await fetch(reqUrl.toString());
      if (!response.ok) {
        throw new Error("Could not get trending gifs from Tenor");
      }
      const results = (await response.json()) as TenorResults;

      return { results: results.results?.map(mapTenorResponse) ?? [], next: results.next };
    },

    async gifs(ids: string[], opt?: APIOpt) {
      if (!ids.length) {
        return [];
      }

      const reqUrl = new URL(API_BASE_URL);
      reqUrl.searchParams.set("ids", ids.join(","));
      reqUrl.searchParams.set("media_filter", "gif,nanogif");
      reqUrl.searchParams.set("limit", opt?.limit?.toString() ?? "10");

      const response = await fetch(reqUrl.toString());
      const results = (await response.json()) as TenorResults;

      return results.results?.map(mapTenorResponse) ?? [];
    },
  };
}

export function mapTenorResponse(response: TenorGif) {
  const medias = response.media_formats;
  const title = response.title || response.content_description;
  const slug = slugify(title);
  return <IGif>{
    id: response.id,
    title: title,
    url: response.itemurl,
    slug,
    download_url: medias.gif.url,
    download_name: `${slug}.gif`,
    preview_gif_url: medias.nanogif.url,
    gif_url: medias.gif.url,
    metadata: {
      width: medias.gif.dims[0],
      height: medias.gif.dims[1],
      size: medias.gif.size,
      labels: [{ title: "Created", text: formatRelative(fromUnixTime(response.created), new Date()) }],
      tags: response.tags,
    },
    attribution: "tenor-logo-square-180.png",
  };
}
