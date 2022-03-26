import fetch from "node-fetch";

export interface TenorResults {
  results: TenorGif[];
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

const API_BASE_URL = "https://g.tenor.com/";

export default class TenorAPI {
  private static locale = "en_US";
  private static mediaFilter = "basic";

  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async trending(options: { offset: number; limit: number }) {
    const reqUrl = new URL("/v1/trending", API_BASE_URL);
    reqUrl.searchParams.set("key", this.apiKey);
    reqUrl.searchParams.set("locale", TenorAPI.locale);
    reqUrl.searchParams.set("media_filter", TenorAPI.mediaFilter);
    reqUrl.searchParams.set("limit", options?.limit?.toString() ?? "10");

    if (options?.offset) {
      reqUrl.searchParams.set("pos", options.offset.toString());
    }

    const resp = await fetch(reqUrl.toString());
    return (await resp.json()) as TenorResults;
  }

  async search(term: string, options: { offset: number; limit?: number }) {
    const reqUrl = new URL("/v1/search", API_BASE_URL);
    reqUrl.searchParams.set("key", this.apiKey);
    reqUrl.searchParams.set("q", term);
    reqUrl.searchParams.set("locale", TenorAPI.locale);
    reqUrl.searchParams.set("media_filter", TenorAPI.mediaFilter);
    reqUrl.searchParams.set("limit", options?.limit?.toString() ?? "10");

    if (options?.offset) {
      reqUrl.searchParams.set("pos", options.offset.toString());
    }

    const resp = await fetch(reqUrl.toString());
    return (await resp.json()) as TenorResults;
  }
}
