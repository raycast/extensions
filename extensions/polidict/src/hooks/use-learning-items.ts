import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createApiClient } from "../api";
import type { LearningItemList, SearchParams, SupportedLanguage } from "../types";
import { queryKeys, readSharedCache, writeSharedCache } from "../features/shared/query-keys";
import { stableDeserialize, stableSerialize } from "../features/shared/serializers";

export function useLearningItems(
  currentLanguage: SupportedLanguage,
  authIdentity: string,
  params?: Partial<SearchParams>,
) {
  const languageCode = currentLanguage.languageCode;
  const searchParams = params ?? {};
  const serializedSearchParams = stableSerialize(searchParams);
  const [revision, setRevision] = useState(() => queryKeys.learningItems.revision(authIdentity, languageCode));

  useEffect(() => {
    setRevision(queryKeys.learningItems.revision(authIdentity, languageCode));
    return queryKeys.learningItems.subscribeRevision(authIdentity, languageCode, setRevision);
  }, [authIdentity, languageCode]);

  const cacheKey = queryKeys.learningItems.list(authIdentity, languageCode, revision, searchParams);

  const {
    data,
    isLoading,
    revalidate: revalidateLearningItems,
    mutate,
  } = useCachedPromise(
    async (revisionToken: string, langCode: string, serializedParams: string, authScope: string) => {
      void revisionToken;
      if (!langCode) {
        return { learningItems: [], hasNext: false };
      }
      const searchParamsForRequest = stableDeserialize<Partial<SearchParams>>(serializedParams);
      const client = createApiClient();
      const result = await client.learningItems.queryLearningItems({
        languageCode: langCode,
        ...searchParamsForRequest,
      });
      writeSharedCache(
        queryKeys.learningItems.list(authScope, langCode, revisionToken, searchParamsForRequest),
        result,
      );
      return result;
    },
    [revision, languageCode, serializedSearchParams, authIdentity],
    {
      execute: !!languageCode,
      keepPreviousData: false,
      initialData: readSharedCache<LearningItemList>(cacheKey),
    },
  );

  const revalidate = () => {
    const currentRevision = queryKeys.learningItems.revision(authIdentity, languageCode);

    if (currentRevision !== revision) {
      setRevision(currentRevision);
      return;
    }

    return revalidateLearningItems();
  };

  return {
    data,
    isLoading,
    mutate,
    revalidate,
  };
}
