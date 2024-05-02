import { Dictionary, Languages } from "./types";

export const getTranslation = (text: string, language: Languages, includeAccents: boolean) => {
  let dictionary: Dictionary;

  switch (language) {
    case Languages.English:
      if (includeAccents) {
        dictionary = require("../assets/data/EN_dictionary.json");
      } else {
        dictionary = require("../assets/data/EN_dictionary-no-accents.json");
      }
      break;
    case Languages.Danish:
      dictionary = require("../assets/data/DA_dictionary.json");
      break;
    case Languages.German:
      dictionary = require("../assets/data/DE_dictionary.json");
      break;
    case Languages.Swedish:
      dictionary = require("../assets/data/SV_dictionary.json");
      break;
    case Languages.Czech:
      dictionary = require("../assets/data/CZ_dictionary.json");
      break;
    default:
      return "This language is not supported yet!";
  }

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
