import got from "got";
import { Cache, environment } from "@raycast/api";
import {
  extractEntitiesFromBookDetailsPage,
  extractEntitiesFromBookSearchPage,
  extractEntitiesFromPeopleSearchPage,
  extractEntitiesFromPersonDetailsPage,
} from "./utils";
import type { Person, Book, BookDetails, PersonDetails } from "./types";

const cache = new Cache();

interface CacheEntry<T> {
  lastSynced: number;
  data: T;
}

const CACHE_EXPIRY_TIME = 1000 * 60 * 60 * 24; // 1 day

const getFromCache = <T>(key: string): T | undefined => {
  const response = cache.get(key);
  if (response) {
    const parsedResponse = JSON.parse(response) as CacheEntry<T>;
    if (Date.now() < parsedResponse.lastSynced + CACHE_EXPIRY_TIME) {
      return parsedResponse.data;
    } else {
      // Remove from cache if it has expired
      cache.remove(key);
    }
  }
};

const addToCache = <T>(key: string, value: T) => {
  const cacheEntry: CacheEntry<T> = { lastSynced: Date.now(), data: value };
  cache.set(key, JSON.stringify(cacheEntry));
};

const enum SEARCH_TYPE {
  BOOKS = "books",
  PEOPLE = "people",
}

export const enum AsyncStatus {
  Success,
  Error,
}

interface ApiResponse<T> {
  status: AsyncStatus;
  data: T;
}

const GOODREADS_URL_BASE = "https://www.goodreads.com";
const SEARCH_URL_BASE = `${GOODREADS_URL_BASE}/search`;
const HEADERS = {
  accept: "text/html,application/xhtml+xml,application/xml",
  "cache-control": "no-cache",
  pragma: "no-cache",
  "User-Agent": `Goodreads Extension, Raycast/${environment.raycastVersion}`,
  "sec-fetch-dest": "document",
  "sec-fetch-mode": "navigate",
};
const RETRY_BASE_DELAY = 1000;

const getSearchPageUrl = (query: string, searchType: SEARCH_TYPE) =>
  `${SEARCH_URL_BASE}?q=${encodeURIComponent(query)}&search_type=${searchType}&search%5Bfield%5D=on`;

export const getDetailsPageUrl = (path: string) => `${GOODREADS_URL_BASE}${path}`;

export const fetchBooksByTitle = async (title: string): Promise<ApiResponse<Book[]>> => {
  const url = getSearchPageUrl(title, SEARCH_TYPE.BOOKS);

  try {
    const response = await fetchWithRetry(url);
    const data = extractEntitiesFromBookSearchPage(response);

    return { status: AsyncStatus.Success, data };
  } catch (error) {
    console.log(`Failed: ${error}`);
    return { status: AsyncStatus.Error, data: [] };
  }
};

export const fetchBookDetails = async (urlSegment: string): Promise<ApiResponse<BookDetails>> => {
  const cacheKey = urlSegment.split("?")[0];
  const cachedResponse = getFromCache<BookDetails>(cacheKey);

  if (cachedResponse) {
    return { status: AsyncStatus.Success, data: cachedResponse };
  }

  const url = getDetailsPageUrl(urlSegment);

  try {
    // Book details page seems to be powered by NextJS and HTML seems to be streamed in
    // At times we only get a partial response that does not included all the info
    // Hence we validate if the HTML received is fully formed, if not retry the fetch
    // Need an alternative way to wait till the entire HTML is received during the GET page call.
    const response = await fetchWithRetry(url, 5, (response) => response.includes("BookPageTitleSection"));
    const data = extractEntitiesFromBookDetailsPage(response, url);
    addToCache(cacheKey, data);

    return { status: AsyncStatus.Success, data };
  } catch (error) {
    console.log(`Failed: ${error}`);
    return { status: AsyncStatus.Error, data: {} as BookDetails };
  }
};

export const fetchPeopleByName = async (name: string): Promise<ApiResponse<Person[]>> => {
  const url = getSearchPageUrl(name, SEARCH_TYPE.PEOPLE);
  try {
    const response = await fetchWithRetry(url);
    const data = extractEntitiesFromPeopleSearchPage(response);
    return { status: AsyncStatus.Success, data };
  } catch (error) {
    console.log(`Failed: ${error}`);
    return { status: AsyncStatus.Error, data: [] };
  }
};

export const fetchPersonDetails = async (urlSegment: string): Promise<ApiResponse<PersonDetails>> => {
  const cacheKey = urlSegment.split("?")[0];
  const cachedResponse = getFromCache<PersonDetails>(cacheKey);

  if (cachedResponse) {
    return { status: AsyncStatus.Success, data: cachedResponse };
  }

  const url = getDetailsPageUrl(urlSegment);

  try {
    const response = await fetchWithRetry(url);
    const data = extractEntitiesFromPersonDetailsPage(response, url);
    addToCache(cacheKey, data);

    return { status: AsyncStatus.Success, data };
  } catch (error) {
    console.log(`Failed: ${error}`);
    return { status: AsyncStatus.Error, data: {} as PersonDetails };
  }
};

const sleep = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

const fetchWithRetry = async (url: string, limit = 2, validate?: (response: string) => boolean): Promise<string> => {
  let retryCount = 0;

  while (retryCount < limit) {
    try {
      const response = await got(url, { retry: { limit }, headers: HEADERS });
      const result = response.body;

      if (validate?.(result) === false) {
        throw new Error("Validation failed");
      }

      return result;
    } catch (error) {
      console.log(`Failed to fetch ${url}. ${error}`);

      const delay = RETRY_BASE_DELAY + 750 * retryCount;
      await sleep(delay);

      retryCount++;
    }
  }

  throw new Error(`Failed after ${limit} retries`);
};
