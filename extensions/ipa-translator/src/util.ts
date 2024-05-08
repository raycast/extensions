import { readFileSync } from "fs-extra";
import { Dictionary } from "./types";

export const readDictionaryData = (path: string) => {
  return readFileSync(__dirname + "/assets/data/" + path, "utf8");
};

export const getTranslation = (text: string, dictionaryPlaceholder: string) => {
  if (!text) {
    return "";
  }
  if (!dictionaryPlaceholder) {
    return "This language is not supported yet!";
  }

  const dictionary: Dictionary = JSON.parse(dictionaryPlaceholder);

  const result: string[] = [];
  // Remove all punctuation.
  const regex = /[.,/#!$%^&*;?+:{}=\-_`~()]/g;
  const words = text.toLowerCase().replace(regex, " ").split(" ");

  words.forEach((item) => {
    const word = dictionary.dict.find(({ original }) => original == item);
    if (!word) {
      if (item) {
        // If a word doesn't match a word in the dictionary, check if any of the
        // letters match something, otherwise return the letter as input.
        const letterArray = item.split("");
        letterArray.forEach((nestedItem) => {
          const letter = dictionary.dict.find(({ original }) => original == nestedItem);
          if (letter) {
            result.push(letter.ipa);
          } else {
            result.push(nestedItem);
          }
        });
      }
    } else {
      result.push(word.ipa);
    }
  });

  return result.join(" ");
};
