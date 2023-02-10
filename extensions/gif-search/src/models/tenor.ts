import formatRelative from "date-fns/formatRelative";
import fromUnixTime from "date-fns/fromUnixTime";
import fetch from "node-fetch";
import path from "path";

import { environment } from "@raycast/api";

import { getAPIKey, GIF_SERVICE } from "../preferences";
import { APIOpt, IGif, IGifAPI, slugify } from "../models/gif";

export interface TenorResults {
  results?: TenorGif[];
  error?: string;
  code?: number;
}

export interface TenorGif {
  created: number;
  hasaudio: boolean;
  hascaption: boolean;
  id: string;
  title: string;
  h1_title: string;
  content_description: string;
  itemurl: string;
  url: string;
  media: TenorMedia[];
  tags: string[];
}

interface TenorMedia {
  [format: string]: {
    preview: string;
    url: string;
    dims: number[];
    size: number;
  };
}

let tenorAPI: TenorAPI;
export async function getAPI(force?: boolean) {
  if (!tenorAPI || force) {
    tenorAPI = new TenorAPI(await getAPIKey(GIF_SERVICE.TENOR, force));
  }

  return tenorAPI;
}

export default async function tenor(force?: boolean) {
  const api = await getAPI(force);

  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const { offset = 0, limit, abort } = opt || {};
      return (await api.search(term, { offset, limit, abort })).results?.map(mapTenorResponse) ?? [];
    },

    async trending(opt?: APIOpt) {
      const { offset = 0, limit = 10, abort } = opt || {};
      return (await api.trending({ offset, limit, abort })).results?.map(mapTenorResponse) ?? [];
    },

    async gifs(ids: string[], opt?: APIOpt) {
      if (!ids.length) {
        return [];
      }

      const { abort } = opt || {};
      return (await api.gifs(ids, { abort })).results?.map(mapTenorResponse) ?? [];
    },
  };
}

const API_BASE_URL = "https://g.tenor.com/";

export class TenorAPI {
  private static locale = "en_US";
  private static mediaFilter = "basic";

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async trending(options: { offset?: number; limit?: number; abort?: AbortController }) {
    const reqUrl = new URL("/v1/trending", API_BASE_URL);
    reqUrl.searchParams.set("key", this.apiKey);
    reqUrl.searchParams.set("locale", TenorAPI.locale);
    reqUrl.searchParams.set("media_filter", TenorAPI.mediaFilter);
    reqUrl.searchParams.set("limit", options?.limit?.toString() ?? "10");
    reqUrl.searchParams.set("media_filter", "minimal");

    if (options?.offset) {
      reqUrl.searchParams.set("pos", options.offset.toString());
    }

    const resp = await fetch(reqUrl.toString(), { signal: options.abort?.signal });
    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    return (await resp.json()) as TenorResults;
  }

  async search(term: string, options: { offset?: number; limit?: number; abort?: AbortController }) {
    const reqUrl = new URL("/v1/search", API_BASE_URL);
    reqUrl.searchParams.set("key", this.apiKey);
    reqUrl.searchParams.set("q", term);
    reqUrl.searchParams.set("locale", TenorAPI.locale);
    reqUrl.searchParams.set("media_filter", TenorAPI.mediaFilter);
    reqUrl.searchParams.set("limit", options?.limit?.toString() ?? "10");
    reqUrl.searchParams.set("media_filter", "minimal");

    if (options?.offset) {
      reqUrl.searchParams.set("pos", options.offset.toString());
    }

    const resp = await fetch(reqUrl.toString(), { signal: options.abort?.signal });
    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    return (await resp.json()) as TenorResults;
  }

  async gifs(ids: string[], options: { limit?: number; abort?: AbortController }) {
    const reqUrl = new URL("/v1/gifs", API_BASE_URL);
    reqUrl.searchParams.set("key", this.apiKey);
    reqUrl.searchParams.set("ids", ids.join(","));
    reqUrl.searchParams.set("limit", options?.limit?.toString() ?? "10");
    reqUrl.searchParams.set("media_filter", "minimal");

    const resp = await fetch(reqUrl.toString(), { signal: options.abort?.signal });
    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    return (await resp.json()) as TenorResults;
  }
}

export function mapTenorResponse(tenorResp: TenorGif) {
  const mediaItem = tenorResp.media[0];
  const title = tenorResp.title || tenorResp.h1_title || tenorResp.content_description;
  return <IGif>{
    id: tenorResp.id,
    title: title,
    url: tenorResp.itemurl,
    slug: slugify(title),
    preview_gif_url: mediaItem.tinygif.url,
    gif_url: mediaItem.gif.url,
    metadata: {
      width: mediaItem.gif.dims[0],
      height: mediaItem.gif.dims[1],
      size: mediaItem.gif.size,
      labels: [{ title: "Created", text: formatRelative(fromUnixTime(tenorResp.created), new Date()) }],
      tags: tenorResp.tags,
    },
    attribution: "tenor-logo-square-180.png",
  };
}
