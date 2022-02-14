import fetch from "node-fetch";
import { SearchType } from "./types";
import { showToast, Toast } from "@raycast/api";

export async function searchWords(wordToSearch: string, type: SearchType): Promise<string[][][]> {
  let url;
  if (type == SearchType.ENEN) {
    url = `https://ac.dict.naver.com/enendict/ac?q_enc='utf-8'&q=${wordToSearch}&st=100&r_lt=100`;
  } else if (type == SearchType.KOKO) {
    url = `https://ac-dict.naver.com/koko/ac?q_enc='utf-8'&q=${wordToSearch}&st=100&r_lt=100`;
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

  const results = (await response.json()) as { query: string[]; items: string[][][][] };
  const words = results["items"][0];
  console.log(words);
  words.forEach((word: string[][]) => {
    console.log(word[0][0]);
    console.log(word[1][0]);
  });

  console.log(words);
  return words;
}
