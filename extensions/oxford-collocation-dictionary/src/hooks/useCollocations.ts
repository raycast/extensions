import { Cache } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { parseHtml } from "../lib/cheerio";

const wordsCache = new Cache();
const URL = "https://m.freecollocation.com/browse";

export function useCollocations(word: string) {
  const hasCache = wordsCache.has(word);
  const { data, isLoading } = useFetch<string>(`${URL}/${word}`, {
    execute: !!word && !hasCache,
    onData: (data) => {
      wordsCache.set(word, data);
    },
  });

  const cachedData = wordsCache.get(word);

  const html = cachedData ? cachedData : (data ?? "");
  const parsedHtml = parseHtml(html);

  return {
    collocations: parsedHtml,
    isLoading,
  };
}
