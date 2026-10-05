import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

import { setJiraNotificationState } from "@/utils";

export function useSetJiraNotificationStateMutation(options?: Partial<UseMutationOptions<void, Error, number>>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => setJiraNotificationState(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "notifications" }] });
    },
    ...options,
  });
}
