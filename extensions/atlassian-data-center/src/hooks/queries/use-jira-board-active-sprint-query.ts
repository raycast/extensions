import { useQuery } from "@tanstack/react-query";

import { JIRA_API } from "@/constants";
import { getJiraBoardSprints, transformURL } from "@/utils";
import type { JiraSprintsResponse, HookQueryOptions } from "@/types";

export function useJiraBoardActiveSprintQuery(
  boardId: number,
  queryOptions?: HookQueryOptions<
    JiraSprintsResponse,
    JiraSprintsResponse["values"][number] | null,
    readonly [{ scope: "jira"; entity: "board"; boardId: number; subEntity: "sprints" }]
  >,
) {
  return useQuery({
    queryKey: [{ scope: "jira", entity: "board", boardId, subEntity: "sprints" }],
    queryFn: ({ queryKey }) => {
      const [{ boardId: id }] = queryKey;
      const url = transformURL(JIRA_API.BOARD_SPRINT, { boardId: id });
      const params = { state: "active" };
      return getJiraBoardSprints(url, params);
    },
    // TODO: Handle multiple active sprints
    select: (data) => data.values?.[0] || null,
    ...queryOptions,
  });
}
