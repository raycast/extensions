import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { createApiClient } from "../api";
import { queryKeys, readSharedCache, writeSharedCache } from "../features/shared/query-keys";

export function useUserProfile(authIdentity: string) {
  const [revision, setRevision] = useState(() => queryKeys.profile.revision(authIdentity));

  useEffect(() => {
    setRevision(queryKeys.profile.revision(authIdentity));
    return queryKeys.profile.subscribeRevision(authIdentity, setRevision);
  }, [authIdentity]);

  const cacheKey = queryKeys.profile.current(authIdentity, revision);
  const {
    data,
    isLoading,
    error,
    revalidate: revalidateProfile,
  } = useCachedPromise(
    async (authIdentityForRequest: string, revisionToken: string) => {
      void authIdentityForRequest;
      const client = createApiClient();
      const result = await client.user.getProfile();
      writeSharedCache(queryKeys.profile.current(authIdentityForRequest, revisionToken), result);
      return result;
    },
    [authIdentity, revision],
    {
      initialData: readSharedCache(cacheKey),
      keepPreviousData: false,
    },
  );

  const revalidate = () => {
    const currentRevision = queryKeys.profile.revision(authIdentity);
    if (currentRevision !== revision) {
      setRevision(currentRevision);
      return;
    }

    return revalidateProfile();
  };

  return {
    profile: data,
    isPlusUser: data?.isPlusUser ?? false,
    canAddLearningItems: data?.canAddLearningItems ?? true,
    canCreateGroups: data?.canCreateGroups ?? true,
    isLoading,
    error,
    revalidate,
  };
}
