import { useFetch } from "@raycast/utils";
import { SEARCH_API_URL } from "../common/constants";
import { useState } from "react";

type Params = {
  collection: "songs" | "artists";
  limit?: number;
};

type SearchResults<D> = {
  hits: Array<{ document: D }>;
};

export function useFetchSearch<T>({ collection, limit = 100 }: Params) {
  const [q, setSearchText] = useState<string>("");

  const searchParams = new URLSearchParams({
    collection,
    limit: String(limit),
    q,
  });
  const fetchResponse = useFetch<SearchResults<T>>(`${SEARCH_API_URL}?${searchParams.toString()}`, {
    execute: Boolean(q),
    keepPreviousData: true,
  });

  return {
    ...fetchResponse,
    setSearchText,
  };
}
