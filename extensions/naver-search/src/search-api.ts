import fetch from "node-fetch";
import { SearchType } from "./types";
import { showToast, Toast } from "@raycast/api";

export async function searchGeneralWords(wordToSearch: string, type: SearchType): Promise<string[][]> {
  let url;
  if (type == SearchType.GENERAL) {
    url = `http://ac.search.naver.com/nx/ac?q_enc='utf-8'&q=${wordToSearch}&st=100&r_lt=100`;
  } else if (type == SearchType.SHOPPING) {
    url = `https://ac.shopping.naver.com/ac?frm='shopping'&q_enc='UTF-8'&q=${wordToSearch}&st=111111&r_lt=111111`;
  } else {
    url = ``;
  }

  const response = await fetch(url, { method: "GET" });
  console.log(url);

  if (!response.ok) {
    await showToast(
      Toast.Style.Failure,
      "Couldn't get results",
      "Word Search wasn't able to get results for this word."
    );
    return [];
  }

  let words;
  if (type == SearchType.SHOPPING) {
    const results = (await response.json()) as { query: string[]; items: string[][][][] };
    words = results["items"][1].map((element) => element[0]);
  } else {
    const results = (await response.json()) as { query: string[]; items: string[][][] };
    words = results["items"][0];
  }
  console.log(words);
  return words;
}
