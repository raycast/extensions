import fetch from "node-fetch";
import { SearchType, Word } from "./types";
import { showToast, Toast } from "@raycast/api";

export async function searchWords(wordToSearch: string, type: SearchType): Promise<Word[]> {
  const searchParams = new URLSearchParams({
    language: "en",
    md: "d",
    max: "25",
    [type]: wordToSearch,
  });

  const url = new URL(`/words?${searchParams}`, "https://api.datamuse.com/words").toString();

  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    await showToast(
      Toast.Style.Failure,
      "Couldn't get results",
      "Word Search wasn't able to get results for this word."
    );
    return [];
  }

  const words = (await response.json()) as Word[];
  words.forEach((word) => {
    if (word.defs == undefined || !word.defs.length) {
      return;
    }

    for (let i = 0; i < word.defs.length; i++) {
      let definition: string = word.defs[i];
      definition = word.defs[i].replace(/\t/g, "~");
      word.defs[i] = definition.split("~")[1];
    }
  });

  return words;
}
