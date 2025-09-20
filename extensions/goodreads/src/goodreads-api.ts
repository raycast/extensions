import got from "got";
import { environment } from "@raycast/api";
import {
  extractEntitiesFromBookDetailsPage,
  extractEntitiesFromBookSearchPage,
  extractEntitiesFromPeopleSearchPage,
  extractEntitiesFromPersonDetailsPage,
} from "./utils";
import type { Person, Book, BookDetails, PersonDetails } from "./types";

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

export const getCacheKey = (url: string): string => {
  // Remove query params
  const cleanUrl = url.split("?")[0];

  // Extract book ID
  const bookIdMatch = cleanUrl.match(/\/book\/show\/(.+)/);
  if (bookIdMatch) {
    return `book:${bookIdMatch[1]}`;
  }

  return `book:${cleanUrl}`;
};

const enum SEARCH_TYPE {
  BOOKS = "books",
  PEOPLE = "people",
}

export const enum AsyncStatus {
  Idle,
  Loading,
  Success,
  Error,
}

interface ApiResponse<T> {
  status: AsyncStatus;
  data: T;
}

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
  const url = getDetailsPageUrl(urlSegment);

  try {
    // Book details page seems to be powered by NextJS and HTML seems to be streamed in
    // At times we only get a partial response that does not included all the info
    // Hence we validate if the HTML received is fully formed, if not retry the fetch
    // Need an alternative way to wait till the entire HTML is received during the GET page call.
    const response = await fetchWithRetry(url, 5, (response) => response.includes("BookPageTitleSection"));
    const data = extractEntitiesFromBookDetailsPage(response, url);

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
  const url = getDetailsPageUrl(urlSegment);

  try {
    const response = await fetchWithRetry(url);
    const data = extractEntitiesFromPersonDetailsPage(response, url);

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
