import { useFetch } from "@raycast/utils";

import { Instance } from "../types";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { useAuthHeader } from "./useAuthHeader";

export const DEFAULT_SEARCH_GROUP_SCOPE = "sn_codesearch";

export interface SearchGroupOption {
  sysId: string;
  scope: string;
  label: string;
}

interface GroupRow {
  sys_id: string;
  name: string;
}

interface GroupsResponse {
  result: GroupRow[];
}

/**
 * Fetches code search groups from sn_codesearch_search_group. The `name`
 * field already comes formatted as "<scope>.<GroupName>" (e.g.
 * "sn_codesearch.Default Search Group"), so we use it directly as the label
 * and derive the scope identifier by splitting on the first dot.
 */
export default function useSearchGroups(selectedInstance: Instance | undefined) {
  const instanceUrl = getInstanceBaseUrl({ name: selectedInstance?.name ?? "" });
  const authHeader = useAuthHeader(selectedInstance);

  const { isLoading, data } = useFetch(
    `${instanceUrl}/api/now/table/sn_codesearch_search_group?sysparm_exclude_reference_link=true&sysparm_display_value=false&sysparm_fields=sys_id,name`,
    {
      headers: authHeader ? { Authorization: authHeader } : undefined,
      execute: !!selectedInstance && !!authHeader,
      onError: (error) => {
        console.error("Could not fetch search groups", error);
      },
      mapResult(response: GroupsResponse) {
        const groups: SearchGroupOption[] = (response.result ?? [])
          .map((g) => {
            const dotIndex = g.name.indexOf(".");
            if (dotIndex <= 0) return null;
            const scope = g.name.slice(0, dotIndex);
            return { sysId: g.sys_id, scope, label: g.name };
          })
          .filter((g): g is SearchGroupOption => g !== null);
        return { data: groups };
      },
      keepPreviousData: true,
    },
  );

  return { isLoading, groups: data ?? [] };
}
