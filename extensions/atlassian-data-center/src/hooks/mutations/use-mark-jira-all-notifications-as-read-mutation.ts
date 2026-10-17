import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

import { markJiraAllNotificationsAsRead } from "@/utils";

export function useMarkJiraAllNotificationsAsReadMutation(options?: Partial<UseMutationOptions<void, Error, void>>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markJiraAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "notifications" }] });
    },
    ...options,
  });
}
