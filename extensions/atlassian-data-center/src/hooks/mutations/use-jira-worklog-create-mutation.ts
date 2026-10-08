import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

import { createJiraWorklog } from "@/utils";
import type { JiraWorklog, JiraWorklogCreateParams } from "@/types";

type JiraWorklogCreateMutationOptions = UseMutationOptions<JiraWorklog, Error, JiraWorklogCreateParams>;

export function useJiraWorklogCreateMutation(options?: Partial<JiraWorklogCreateMutationOptions>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createJiraWorklog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "worklog" }] });
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "search", type: "issues" }] });
    },
    ...options,
  });
}
