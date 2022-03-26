import fetch from "node-fetch";

export interface FinerGifsClubResults {
  results: FinerGif[];
}

export interface FinerGif {
  id: string;
  fields: {
    name: string;
    text: string;
    fileid: string;
  };
}

const API_BASE_URL = "https://api.thefinergifs.club/";

export default class FinerGifsClubAPI {
  async search(term: string, options: { offset: number; limit?: number }) {
    const reqUrl = new URL("/search", API_BASE_URL);
    reqUrl.searchParams.set("q", term);
    reqUrl.searchParams.set("q.parser", "simple");
    reqUrl.searchParams.set("sort", "_score desc");
    reqUrl.searchParams.set("size", options?.limit?.toString() ?? "10");

    if (options?.offset) {
      reqUrl.searchParams.set("start", options.offset.toString());
    }

    const resp = await fetch(reqUrl.toString());
    return (await resp.json()) as FinerGifsClubResults;
  }
}
