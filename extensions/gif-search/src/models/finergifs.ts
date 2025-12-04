import fetch from "node-fetch";

import { APIOpt, IGif, IGifAPI, slugify } from "./gif";

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

export function getAPI() {
  return new FinerGifsClubAPI();
}

export default function finergifs() {
  const api = getAPI();

  return <IGifAPI>{
    async search(term: string, opt?: APIOpt) {
      const { offset = 0, limit } = opt || {};
      const results = await api.search(term, { offset, limit });
      return { results: results.results.map(mapFinerGifsResponse) };
    },

    async trending() {
      return { results: [] };
    },

    async gifs(ids: string[]) {
      if (!ids.length) {
        return [];
      }

      const results = await api.gifs(ids);
      return results.results.map(mapFinerGifsResponse);
    },
  };
}

const API_BASE_URL = "https://api.thefinergifs.club/";

export class FinerGifsClubAPI {
  async search(term: string, options: { offset: number; limit?: number; abort?: AbortController }) {
    const reqUrl = new URL("/search", API_BASE_URL);
    reqUrl.searchParams.set("q", term);
    reqUrl.searchParams.set("q.parser", "simple");
    reqUrl.searchParams.set("sort", "_score desc");
    reqUrl.searchParams.set("size", options?.limit?.toString() ?? "10");

    if (options?.offset) {
      reqUrl.searchParams.set("start", options.offset.toString());
    }

    const resp = await fetch(reqUrl.toString(), { signal: options.abort?.signal });
    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    return (await resp.json()) as FinerGifsClubResults;
  }

  async gifs(ids: string[]) {
    const reqUrl = new URL("/search", API_BASE_URL);
    reqUrl.searchParams.set("q", ids.join("|"));
    reqUrl.searchParams.set("q.parser", "simple");
    reqUrl.searchParams.set("q.options", JSON.stringify({ fields: ["fileid"] }));
    reqUrl.searchParams.set("size", "10");

    const resp = await fetch(reqUrl.toString());
    if (!resp.ok) {
      throw new Error(resp.statusText);
    }
    return (await resp.json()) as FinerGifsClubResults;
  }
}

const EPISODE_NUM_REGEX = /^(\d{2})x(\d{2})-.+/i;

export function mapFinerGifsResponse(finerGifsResp: FinerGif) {
  const gifUrl = new URL(finerGifsResp.fields.fileid + ".gif", "https://media.thefinergifs.club");
  const [, season, episode] = finerGifsResp.fields.fileid.match(EPISODE_NUM_REGEX) || new Array(2);
  const epInt = parseInt(season, 10);

  const slug = slugify(finerGifsResp.fields.text);

  return <IGif>{
    id: finerGifsResp.fields.fileid,
    title: finerGifsResp.fields.text,
    slug,
    download_url: gifUrl.toString(),
    download_name: `${slug}.gif`,
    preview_gif_url: gifUrl.toString(),
    gif_url: gifUrl.toString(),
    metadata:
      season || episode
        ? {
            labels: [season && { title: "Season", text: season }, episode && { title: "Episode", text: episode }],
            links: [
              epInt && {
                title: "The TVDB",
                text: `Season ${epInt}`,
                target: `https://thetvdb.com/series/the-office-us/seasons/official/${epInt}`,
              },
            ],
          }
        : undefined,
  };
}
