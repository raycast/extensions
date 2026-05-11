import { useQuery } from "@tanstack/react-query";

import { JIRA_API } from "@/constants";
import { getJiraBoardConfiguration, transformURL } from "@/utils";
import type { JiraBoardConfiguration, HookQueryOptions } from "@/types";

export function useJiraBoardConfigurationQuery(
  boardId: number,
  queryOptions?: HookQueryOptions<
    JiraBoardConfiguration,
    JiraBoardConfiguration,
    readonly [{ scope: "jira"; entity: "board"; boardId: number; subEntity: "configuration" }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "board", boardId, subEntity: "configuration" }],
    queryFn: ({ queryKey }) => {
      const [{ boardId: id }] = queryKey;
      const url = transformURL(JIRA_API.BOARD_CONFIGURATION, { boardId: id });
      return getJiraBoardConfiguration(url);
    },
    staleTime: Infinity,
    gcTime: Infinity,
    ...queryOptions,
  });
}
