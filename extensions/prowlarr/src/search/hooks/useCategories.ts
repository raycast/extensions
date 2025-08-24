import { IndexerCategory, prowlarrApi } from "../../prowlarrApi";
import { useCachedFetch } from "./useCachedFetch";

export function useCategories() {
  return useCachedFetch("categories", fetchCategories);
}

type IndexerCategoryModel = {
  id: number;
  name: string;
  subCategories: Array<IndexerCategoryModel>;
};

function toModel(indexer: IndexerCategory): IndexerCategoryModel {
  return {
    id: indexer.id ?? 0,
    name: indexer.name ?? "",
    subCategories: indexer.subCategories?.map(toModel) ?? [],
  };
}

async function fetchCategories(): Promise<IndexerCategoryModel[]> {
  const [url, queryParams] = prowlarrApi.v1IndexerCategoriesList();

  const response = await fetch(url, queryParams);
  const responseJson = await (response.json() as unknown as Promise<IndexerCategory[]>);

  return responseJson.map(toModel);
}
