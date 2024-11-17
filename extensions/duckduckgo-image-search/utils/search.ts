/* eslint-disable no-constant-condition */
import axios, { AxiosRequestConfig } from "axios";
import { decode } from "html-entities";

import {
  DDG_URL,
  HEADERS,
  ImageSearchOptions,
  DEFAULT_RETRIES,
  DEFAULT_SLEEP,
} from "./consts";

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
 * @param options The options of the HTTP request
 * @returns The VQD
 */
async function getVQD(query: string, ia = "web") {
  try {
    const response = await axios.get(`https://duckduckgo.com/`, {
      params: { q: query, ia },
    });
    return VQD_REGEX.exec(response.data)![1];
  } catch {
    throw new Error(`Failed to get the VQD for query "${query}".`);
  }
}

function queryString(query: Record<string, string>) {
  return new URLSearchParams(query).toString();
}

async function makeNextFromQuery(
  query: string,
  options: ImageSearchOptions = {},
): Promise<{ next: string; vqd: string }> {
  let vqd = options.vqd!;
  if (!vqd) vqd = await getVQD(query, "web");

  /* istanbul ignore next */
  const filters = [
    options.filters?.size ? `size:${options.filters.size}` : "",
    options.filters?.type ? `type:${options.filters.type}` : "",
    options.filters?.layout ? `layout:${options.filters.layout}` : "",
    options.filters?.color ? `color:${options.filters.color}` : "",
    options.filters?.license ? `license:${options.filters.license}` : "",
  ];

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
  const { next, vqd } = await makeNextFromQuery(query, options);
  return await imageNextSearch(next, vqd, retries, sleep, signal);
}

export async function imageNextSearch(
  next: string,
  vqd: string,
  retries: number = DEFAULT_RETRIES,
  sleep: number = DEFAULT_SLEEP,
  signal?: AbortSignal,
): Promise<ImageSearchResult> {
  const reqUrl = DDG_URL + next + `&vqd=${vqd}`;
  let attempt = 0;
  const config: AxiosRequestConfig = {
    headers: HEADERS,
  };

  if (signal) {
    config.signal = signal;
  }

  try {
    let data: DuckDuckGoSearchResponse | null = null;

    while (true) {
      try {
        const response = await axios.get(reqUrl, config);

        data = response.data as DuckDuckGoSearchResponse;
        if (!data.results) throw Error("No results");
        break;
      } catch (error) {
        console.error(reqUrl, error);
        attempt += 1;
        if (attempt > retries) {
          throw Error("attempt finished");
        }
        await sleepPromise(sleep);
        continue;
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
  } catch (error) {
    console.error(error);
    throw error;
  }
}
