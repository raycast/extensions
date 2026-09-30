import { useQuery } from "@tanstack/react-query";

import { getJiraBoards } from "@/utils";
import type { JiraBoardsResponse, HookQueryOptions } from "@/types";

export function useJiraBoardsQuery(
  queryOptions?: HookQueryOptions<
    JiraBoardsResponse,
    JiraBoardsResponse["values"],
    readonly [{ scope: "jira"; entity: "boards" }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "boards" }],
    queryFn: getJiraBoards,
    select: (data) => data.values ?? [],
    staleTime: Infinity,
    gcTime: Infinity,
    ...queryOptions,
  });
}
