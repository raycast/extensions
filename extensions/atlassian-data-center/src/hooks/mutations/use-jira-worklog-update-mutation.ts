import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

import { updateJiraWorklog } from "@/utils";
import type { JiraWorklog, JiraWorklogUpdateParams } from "@/types";

type JiraWorklogUpdateMutationParams = { worklogId: number; params: JiraWorklogUpdateParams };
type JiraWorklogUpdateMutationOptions = UseMutationOptions<JiraWorklog, Error, JiraWorklogUpdateMutationParams>;

export function useJiraWorklogUpdateMutation(options?: Partial<JiraWorklogUpdateMutationOptions>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ worklogId, params }) => updateJiraWorklog(worklogId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "worklog" }] });
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "search", type: "issues" }] });
    },
    ...options,
  });
}
