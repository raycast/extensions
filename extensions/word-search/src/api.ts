import fetch from "node-fetch";
import { Word, SearchType } from "./types";

export async function searchWords(wordToSearch: string, type: SearchType): Promise<Word[]> {
  console.log("got here somehow");

  const url = `https://api.datamuse.com/words?rel_${type}=${wordToSearch}&md=d&max=20`;

  console.log("----> ", wordToSearch);
  console.log(url);
  const response = await fetch(url, { method: "GET" });

  if (!response.ok) {
    // error
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
