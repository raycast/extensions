import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { useQuery, skipToken } from "@tanstack/react-query";

import { getConfluenceCurrentUser } from "@/utils";
import { CACHE_KEY } from "@/constants";
import type { ConfluenceCurrentUser } from "@/types";

export function useConfluenceCurrentUser() {
  const [currentUser, setCurrentUser] = useCachedState<ConfluenceCurrentUser | null>(
    CACHE_KEY.CONFLUENCE_CURRENT_USER,
    null,
  );

  const enabled = !currentUser;

  const queryResult = useQuery({
    queryKey: [{ scope: "confluence", entity: "current-user" }],
    queryFn: !enabled ? skipToken : getConfluenceCurrentUser,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity,
    meta: { errorMessage: "Failed to Load User" },
  });

  useEffect(() => {
    if (queryResult.data) {
      setCurrentUser(queryResult.data);
    }
  }, [queryResult.data]);

  return {
    ...queryResult,
    currentUser,
  };
}
