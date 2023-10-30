import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { autoCompleteItem, Preferences, SearchResult } from "./types";
import fetch from "node-fetch";
import iconv from "iconv-lite";
import { SearchTypeDict } from "./types";
import { resultsParser, descriptionParser } from "./parser";

export async function getSearchHistory(): Promise<SearchResult[]> {
  const { rememberSearchHistory } = getPreferenceValues<Preferences>();

  if (!rememberSearchHistory) {
    return [];
  }

  const historyString = (await LocalStorage.getItem("history")) as string;

  if (historyString === undefined) {
    return [];
  }

  const items: SearchResult[] = JSON.parse(historyString);
  return items;
}

export function getStaticResult(searchText: string, searchType: string): SearchResult[] {
  if (!searchText) {
    return [];
  }
  const searchTypeObj = SearchTypeDict[searchType];
  const baseURL = searchTypeObj.baseURL;
  const searchName = searchTypeObj.name;

  const result: SearchResult[] = [
    {
      id: nanoid(),
      query: searchText,
      description: `Search ${searchName} for '${searchText}'`,
      url: `${baseURL}${encodeURIComponent(searchText)}`,
    },
  ];

  return result;
}

export async function getAutoSearchResults(
  searchText: string,
  searchType: string,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const searchTypeObj = SearchTypeDict[searchType];
  const searchURL = searchTypeObj.searchURL;
  const baseURL = searchTypeObj.baseURL;
  const searchName = searchTypeObj.name;
  const response = await fetch(`${searchURL}${encodeURIComponent(searchText)}`, {
    method: "get",
    signal: signal,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const buffer = await response.arrayBuffer();
  const text = iconv.decode(Buffer.from(buffer), "utf-8");
  const json = JSON.parse(text);
  const res = resultsParser[searchType](json);

  const results: SearchResult[] = [];
  res.map((item: autoCompleteItem, _i: number) => {
    const { query, description } = descriptionParser[searchType](item);
    results.push({
      id: nanoid(),
      query: query,
      description: description,
      url: `${baseURL}${encodeURIComponent(query)}`,
    });
  });

  return results;
}
