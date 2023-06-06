import fetch from "node-fetch";
import { SearchType } from "./types";
import { showToast, Toast } from "@raycast/api";

export async function searchWords(wordToSearch: string, type: string): Promise<string[][][]> {
  const url = SearchType[type].searchURL + wordToSearch;
  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    await showToast(
      Toast.Style.Failure,
      "Couldn't get results",
      "Word Search wasn't able to get results for this word."
    );
    return [];
  }

  const results = (await response.json()) as { query: string[]; items: string[][][][] };
  const words = results["items"][0];

  return words;
}
