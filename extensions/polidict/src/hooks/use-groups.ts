import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createApiClient } from "../api";
import type { GroupList, SupportedLanguage } from "../types";
import { queryKeys, readSharedCache, writeSharedCache } from "../features/shared/query-keys";

export function useGroups(
  currentLanguage: SupportedLanguage,
  authIdentity: string,
  params?: { page?: number; pageSize?: number },
) {
  const languageCode = currentLanguage.languageCode;
  const page = params?.page;
  const pageSize = params?.pageSize;
  const paramsKey = `${page ?? ""}|${pageSize ?? ""}`;

  const [revision, setRevision] = useState(() => queryKeys.groups.revision(authIdentity, languageCode));

  useEffect(() => {
    setRevision(queryKeys.groups.revision(authIdentity, languageCode));
    return queryKeys.groups.subscribeRevision(authIdentity, languageCode, setRevision);
  }, [authIdentity, languageCode]);

  const cacheKey = queryKeys.groups.list(authIdentity, languageCode, revision);

  const {
    data,
    isLoading,
    revalidate: revalidateGroups,
  } = useCachedPromise(
    async (revisionToken: string, langCode: string, authScope: string, _paramsKey: string) => {
      void revisionToken;
      void _paramsKey;
      if (!langCode) {
        return { groups: [], hasNext: false };
      }
      const client = createApiClient();
      const result = await client.groups.queryGroups(
        langCode,
        undefined,
        page !== undefined || pageSize !== undefined ? { page, pageSize } : undefined,
      );
      writeSharedCache(queryKeys.groups.list(authScope, langCode, revisionToken), result);
      return result;
    },
    [revision, languageCode, authIdentity, paramsKey],
    {
      execute: !!languageCode,
      keepPreviousData: false,
      initialData: readSharedCache<GroupList>(cacheKey),
    },
  );

  const revalidate = () => {
    const currentRevision = queryKeys.groups.revision(authIdentity, languageCode);

    if (currentRevision !== revision) {
      setRevision(currentRevision);
      return;
    }

    return revalidateGroups();
  };

  return {
    data: data?.groups,
    hasNext: data?.hasNext ?? false,
    isLoading,
    revalidate,
  };
}
