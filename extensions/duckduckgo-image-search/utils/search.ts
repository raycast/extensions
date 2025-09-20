import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { decode } from "html-entities";

import {
  DDG_URL,
  DEFAULT_RETRIES,
  DEFAULT_SLEEP,
  DEFAULT_TIMEOUT,
  HEADERS,
  ImageSearchOptions,
  OldVQDError,
} from "./consts";
import { LocalStorage } from "@raycast/api";

export interface DuckDuckGoImage {
  height: number;
  image: string;
  image_token: string;
  source: "Bing" | string;
  thumbnail: string;
  thumbnail_token: string;
  title: string;
  url: string;
  width: number;
}

interface DuckDuckGoSearchResponse {
  next?: string; // 'i.js?q=Query&o=json&p=-1&s=100&u=bing&f=,,,&l=en-us'
  query: string;
  queryEncoded: string;
  response_type: "images";
  results: DuckDuckGoImage[];
}

export interface ImageSearchResult {
  next?: string;
  vqd: string;
  results: DuckDuckGoImage[];
}

function sleepPromise(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** @internal */
const VQD_REGEX = /vqd=['"](\d+-\d+(?:-\d+)?)['"]/;

/**
 * Get the VQD of a search query.
 * @param query The query to search
 * @param ia The type(?) of search
 * @param signal Abort Signal controller
 * @returns The VQD
 */
async function getVQD(query: string, ia = "web", signal?: AbortSignal) {
  let vqd = await LocalStorage.getItem<string>("vqd");
  if (vqd) return vqd;

  try {
    const response = await axios.get(`https://duckduckgo.com/`, {
      params: { q: query, ia },
      timeout: DEFAULT_TIMEOUT,
      signal,
    });
    const match = VQD_REGEX.exec(response.data);
    if (!match) {
      // noinspection ExceptionCaughtLocallyJS
      throw new Error(`Failed to extract VQD from response for query "${query}".`);
    }
    vqd = match[1];
    await LocalStorage.setItem("vqd", vqd);
    return vqd;
  } catch (error) {
    if (error instanceof AxiosError && error.code === "ERR_CANCELED") {
      console.log("VQD request canceled");
      return;
    }
    console.error("VQD Error!", error);
    throw new Error(`Failed to get the VQD for query "${query}".`);
  }
}

function queryString(query: Record<string, string>) {
  return new URLSearchParams(query).toString();
}

async function makeNextFromQuery(
  query: string,
  options: ImageSearchOptions = {},
  signal?: AbortSignal,
): Promise<{ next: string; vqd: string } | undefined> {
  let vqd: string | undefined = options.vqd!;
  if (!vqd) vqd = await getVQD(query, "web", signal);
  if (!vqd) return;

  /* istanbul ignore next */
  const filters = [
    options.filters?.size ? `size:${options.filters.size}` : "",
    options.filters?.type ? `type:${options.filters.type}` : "",
    options.filters?.layout ? `layout:${options.filters.layout}` : "",
    options.filters?.color ? `color:${options.filters.color}` : "",
    options.filters?.license ? `license:${options.filters.license}` : "",
  ];
  console.log(filters);

  const queryObject: Record<string, string> = {
    l: options.locale || "en-us",
    o: "json",
    q: query,
    p: options.moderate ? "1" : "-1",
    f: filters.toString(),
  };

  return {
    next: `i.js?${queryString(queryObject)}`,
    vqd,
  };
}

export async function imageSearch(
  query: string,
  options: ImageSearchOptions = {},
  retries: number = DEFAULT_RETRIES,
  sleep: number = DEFAULT_SLEEP,
  signal?: AbortSignal,
): Promise<ImageSearchResult> {
  console.log(`Searching for "${query}"...`);
  const data = await makeNextFromQuery(query, options, signal);
  if (!data) return { vqd: "", results: [] };
  const { next, vqd } = data;
  try {
    return await imageNextSearch(next, vqd, retries, sleep, signal);
  } catch (error) {
    if (error instanceof OldVQDError) {
      await LocalStorage.removeItem("vqd");
      return await imageSearch(query, options, retries, sleep, signal);
    }
    throw error;
  }
}

export async function imageNextSearch(
  next: string,
  vqd: string,
  retries: number = DEFAULT_RETRIES,
  sleep: number = DEFAULT_SLEEP,
  signal?: AbortSignal,
): Promise<ImageSearchResult> {
  if (!vqd) return { vqd: "", results: [] };
  console.log(`Searching for "${next}" with VQD "${vqd}"... (retries: ${retries}, sleep: ${sleep}ms)`);
  const reqUrl = DDG_URL + next + `&vqd=${vqd}`;
  let attempt = 0;
  const config: AxiosRequestConfig = {
    headers: HEADERS,
    timeout: DEFAULT_TIMEOUT,
    signal,
  };

  let data: DuckDuckGoSearchResponse | null = null;

  while (true) {
    try {
      const response = await axios.get(reqUrl, config);

      data = response.data as DuckDuckGoSearchResponse;
      console.log(data, "results found" + (attempt ? ` (attempt ${attempt})` : ""));
      break;
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.code === "ERR_CANCELED") {
          console.log("VQD request canceled");
          return { results: [], vqd };
        }
        if (error.response?.status === 403) {
          console.log("OLD VQD, getting new one...");
          await LocalStorage.removeItem("vqd");
          throw new OldVQDError();
        }
      }
      console.error(reqUrl, error);
      attempt += 1;
      if (attempt > retries) {
        throw Error("attempt finished");
      }
      await sleepPromise(sleep);
    }
  }
  const result: ImageSearchResult = {
    vqd,
    results: data.results.map((r) => ({
      ...r,
      title: decode(r.title),
    })),
  };
  if (data.next) result.next = data.next;
  return result;
}
