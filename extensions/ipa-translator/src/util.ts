import { readFileSync } from "fs-extra";
import { DictionaryItem } from "./types";
import { Dispatch, SetStateAction } from "react";

export const readDictionaryData = (path: string) => {
  return readFileSync(__dirname + "/assets/data/" + path, "utf8");
};

export const getTranslation = (
  text: string,
  dictionary: DictionaryItem[],
  setWordsNotFound: Dispatch<SetStateAction<string[]>>,
) => {
  if (!text) {
    return "";
  }

  function findInDictionary(word: string) {
    const item = dictionary.filter(({ o }) => o === word);
    if (!item[0]) {
      return "";
    }
    return item[0].i;
  }

  const result: string[] = [];
  const words = text
    .toLowerCase()
    // Remove all unwanted punctuation.
    .replace(/[.,/#!$%^&*;?+:{}=\-_`~()@[\]<>"]/g, " ")
    // Replace all instances of multiple whitespace characters with single space.
    .replace(/\s+/g, " ")
    // Remove trailing whitespace.
    .replace(/[ \t]+$/, "")
    .split(" ");

  words.forEach((item) => {
    const word = findInDictionary(item);
    if (word) {
      result.push(word);
    } else if (item) {
      // If a word doesn't match a word in the dictionary, check if any of the
      // letters match something, otherwise return the letter as input.
      setWordsNotFound((prevState) => [...prevState, item]);
      const letterArray = item.split("");
      letterArray.forEach((nestedItem) => {
        const letter = findInDictionary(nestedItem);
        if (letter) {
          result.push(letter);
        } else {
          result.push(nestedItem);
        }
      });
    }
  });

  return result.join(" ");
};
