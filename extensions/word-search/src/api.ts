import fetch from "node-fetch";
import { SearchType, Word } from "./types";
import { showToast, ToastStyle } from "@raycast/api";

export async function searchWords(wordToSearch: string, type: SearchType): Promise<Word[]> {
  let url;

  if (type == SearchType.SYNONYM) {
    // More accurate for synonym
    url = `https://api.datamuse.com/words?ml=${wordToSearch}&md=d&max=20`;
  } else {
    url = `https://api.datamuse.com/words?rel_${type}=${wordToSearch}&md=d&max=20`;
  }

  const response = await fetch(url, { method: "GET" });
  //https://api.datamuse.com/words?md=d&max=20&ml=addition
  console.log(url);

  if (!response.ok) {
    await showToast(
      ToastStyle.Failure,
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
