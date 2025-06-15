import parse from "node-html-parser";

import { ResultItem, Translation } from "../types";

export const parseDOMResult = (dom: ReturnType<typeof parse>): Array<ResultItem> => {
  const list = dom.querySelectorAll(".autocompletion_item");

  return Array.from(list)
    .map((item): ResultItem | undefined => {
      const $mainItem = item.querySelector(".main_row .main_item");
      const word = $mainItem?.textContent;
      const href = $mainItem?.attributes.href;
      const lid = $mainItem?.attributes.lid;
      const wordType = item.querySelector(".main_row .main_wordtype")?.textContent;
      const translationDOMList = item.querySelectorAll(".translation_item");
      const translations = Array.from(translationDOMList)
        .map((item): Translation | undefined => {
          const lid = item.attributes.lid;
          const wordType = item.querySelector(".wordtype")?.textContent;
          item.querySelector(".sep")?.replaceWith("");
          item.querySelector(".wordtype")?.replaceWith("");

          const word = item.textContent?.trim();

          if (!word || !wordType || !href || !lid) return;

          return {
            word,
            wordType,
            lid,
          };
        })
        .filter((item): item is Translation => !!item);

      if (!word || !wordType || !lid || !href) return;

      return {
        word: word,
        wordType: wordType,
        lid,
        href,
        translations: translations,
      };
    })
    .filter((item): item is ResultItem => !!item);
};
