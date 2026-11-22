import { useCallback, useEffect, useState } from "react";
import { collectionTaxonomy, genreTaxonomy, stageTaxonomy } from "@/core/metadata/taxonomies";
import type { TaxonomyOption } from "@/core/metadata/taxonomy";

/** 三套标签选项：挂载时读一次；合集里新建或改名后，用 reloadCollections 重读合集那一套。 */
export function useTaxonomies(): {
  stageOptions: TaxonomyOption[];
  genreOptions: TaxonomyOption[];
  collectionOptions: TaxonomyOption[];
  reloadCollections: () => void;
} {
  const [stageOptions, setStageOptions] = useState<TaxonomyOption[]>([]);
  const [genreOptions, setGenreOptions] = useState<TaxonomyOption[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<TaxonomyOption[]>([]);

  useEffect(() => {
    void stageTaxonomy.get().then(setStageOptions);
    void genreTaxonomy.get().then(setGenreOptions);
    void collectionTaxonomy.get().then(setCollectionOptions);
  }, []);

  const reloadCollections = useCallback(() => {
    void collectionTaxonomy.get().then(setCollectionOptions);
  }, []);

  return { stageOptions, genreOptions, collectionOptions, reloadCollections };
}
