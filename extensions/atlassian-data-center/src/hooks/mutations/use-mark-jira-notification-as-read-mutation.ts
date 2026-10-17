import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseMutationOptions } from "@tanstack/react-query";

import { markJiraNotificationAsRead } from "@/utils";

export function useMarkJiraNotificationAsReadMutation(options?: Partial<UseMutationOptions<void, Error, number>>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId) => markJiraNotificationAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [{ scope: "jira", entity: "notifications" }] });
    },
    ...options,
  });
}
