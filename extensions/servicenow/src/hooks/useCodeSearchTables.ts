import { useFetch } from "@raycast/utils";

import { Instance } from "../types";
import { getInstanceBaseUrl } from "../utils/instanceUrl";
import { useAuthHeader } from "./useAuthHeader";

interface TableRow {
  table: string;
}

interface TablesResponse {
  result: TableRow[];
}

export default function useCodeSearchTables(selectedInstance: Instance | undefined, searchGroupSysId: string) {
  const instanceUrl = getInstanceBaseUrl({ name: selectedInstance?.name ?? "" });
  const authHeader = useAuthHeader(selectedInstance);

  const params = new URLSearchParams({
    sysparm_query: `search_group=${searchGroupSysId}`,
    sysparm_fields: "table",
    sysparm_exclude_reference_link: "true",
  });

  const { isLoading, data } = useFetch(`${instanceUrl}/api/now/table/sn_codesearch_table?${params.toString()}`, {
    headers: authHeader ? { Authorization: authHeader } : undefined,
    execute: !!selectedInstance && !!authHeader && !!searchGroupSysId,
    onError: (error) => {
      console.error("Could not fetch code search tables", error);
    },
    mapResult(response: TablesResponse) {
      const tables = (response.result ?? []).map((r) => r.table).filter((t): t is string => !!t);
      return { data: tables };
    },
    keepPreviousData: true,
  });

  return { isLoading, tables: data ?? [] };
}
