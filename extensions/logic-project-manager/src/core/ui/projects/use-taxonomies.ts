import { useCallback } from "react";
import { usePromise } from "@raycast/utils";
import { collectionTaxonomy, genreTaxonomy, stageTaxonomy } from "@/core/metadata/taxonomies";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";

type Taxonomies = {
  stages: TaxonomyOption[];
  genres: TaxonomyOption[];
  collections: TaxonomyOption[];
};

// 三套标签选项一次读完：用 usePromise 拿到加载状态和失败路径，不再自己拼 useState + useEffect。
async function loadTaxonomies(): Promise<Taxonomies> {
  const [stages, genres, collections] = await Promise.all([
    stageTaxonomy.get(),
    genreTaxonomy.get(),
    collectionTaxonomy.get(),
  ]);
  return { stages, genres, collections };
}

/** 三套标签选项：挂载时读一次；合集里新建或改名后，用 reloadCollections 重读合集那一套。 */
export function useTaxonomies(): {
  stageOptions: TaxonomyOption[];
  genreOptions: TaxonomyOption[];
  collectionOptions: TaxonomyOption[];
  reloadCollections: () => void;
} {
  const { data, revalidate } = usePromise(loadTaxonomies, []);

  const reloadCollections = useCallback(() => {
    void revalidate();
  }, [revalidate]);

  return {
    stageOptions: data?.stages ?? [],
    genreOptions: data?.genres ?? [],
    collectionOptions: data?.collections ?? [],
    reloadCollections,
  };
}
