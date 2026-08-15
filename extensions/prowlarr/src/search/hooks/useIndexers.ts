import { IndexerResource, prowlarrApi } from "../../prowlarrApi";
import { NonNullableFields } from "../types";
import { useCachedFetch } from "./useCachedFetch";

export function useIndexers() {
  return useCachedFetch("indexers", fetchIndexers);
}

type IndexerModel = NonNullableFields<Pick<IndexerResource, "id" | "name">>;

async function fetchIndexers(): Promise<IndexerModel[]> {
  const [url, queryParams] = prowlarrApi.v1IndexerList();

  const response = await fetch(url, queryParams);
  const responseJson = await (response.json() as unknown as Promise<IndexerResource[]>);

  return responseJson
    .filter((indexer) => indexer.enable)
    .map((indexer) => ({ id: indexer.id ?? 0, name: indexer.name ?? "" }));
}
