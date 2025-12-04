import { useEffect } from "react";
import { useCachedState } from "@raycast/utils";
import { useQuery, skipToken } from "@tanstack/react-query";

import { getJiraCurrentUser } from "@/utils";
import { CACHE_KEY } from "@/constants";
import type { JiraCurrentUser } from "@/types";

export function useJiraCurrentUser() {
  const [currentUser, setCurrentUser] = useCachedState<JiraCurrentUser | null>(CACHE_KEY.JIRA_CURRENT_USER, null);

  const enabled = !currentUser;

  const queryResult = useQuery({
    queryKey: [{ scope: "jira", entity: "current-user" }],
    queryFn: !enabled ? skipToken : getJiraCurrentUser,
    enabled,
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
