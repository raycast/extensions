import React from "react";
import useFetchAsync from "./useFetchAsync";

/**
 * Wrapper around the Jotoba API using fetch (well, technically the kinda useless useFetchAsync hook...)
 * @param {string} api  -  words, kanji, sentences, names or by_radical
 */
const useJotobaAsync = (api = "words") => {
  let baseUrl = "";
  switch (api) {
    case "words":
    case "kanji":
    case "sentences":
    case "names":
      baseUrl = `https://jotoba.de/api/search/${api}`;
      break;
    case "by_radical":
      baseUrl = `https://jotoba.de/api/kanji/by_radical`;
      break;
    default:
      throw new Error(`Jotoba API ${api} doesn't exist.`);
  }
  const sendRq = useFetchAsync(baseUrl);

  return async (config: { bodyData: JotobaBodyData; signal?: AbortSignal }) => {
    return sendRq(
      {
        method: "POST",
        signal: config.signal || undefined,
        bodyData: config.bodyData,
      },
      (results: JotobaResults) => {
        if (results) {
          if (api === "words") {
            if (results.kanji.length > 0 || results.words.length > 0) return Promise.resolve(results);
          } else if (Object.entries(results).length > 0) return Promise.resolve(results);
        }

        return Promise.reject("Couldn't find results.");
      },
    );
  };
};

export default useJotobaAsync;
