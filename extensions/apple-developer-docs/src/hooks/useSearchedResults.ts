import { LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { equals } from "../utils";

const SEARCHED_RESULTS_KEY = "SEARCHED_RESULTS";
const MAX_SEARCHED_RESULTS_COUNT = 20;

async function load() {
  const result = await LocalStorage.getItem<string>(SEARCHED_RESULTS_KEY);
  if (result) {
    const parsed = JSON.parse(result);
    return parsed as ResultLike[];
  } else {
    return [];
  }
}

async function save(results: ResultLike[]) {
  const result = JSON.stringify(results);
  await LocalStorage.setItem(SEARCHED_RESULTS_KEY, result);
}

export async function clear() {
  await LocalStorage.removeItem(SEARCHED_RESULTS_KEY);
}

export default function useSearchedResults() {
  const [results, setResults] = useState<ResultLike[]>();

  useEffect(() => {
    load().then(setResults);
  }, []);

  const markAsSearched = (result: ResultLike) => {
    const newResults = [result, ...(results?.filter((r) => !equals(r, result)) ?? [])].slice(
      0,
      MAX_SEARCHED_RESULTS_COUNT
    );
    setResults(newResults);
    save(newResults);
  };

  return { results, isLoading: !results, markAsSearched };
}
