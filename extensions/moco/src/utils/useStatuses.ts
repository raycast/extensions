import { usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { getAllStatus, removeStatus, setStatus, StatusKind, StatusType } from "./storage";

// Favorite / hidden statuses of one kind, with an optimistic update on change.
// `status: undefined` removes the status of the item.
export const useStatuses = (kind: StatusKind) => {
  const { data: statuses, isLoading, mutate } = usePromise(getAllStatus, [kind]);

  const changeStatus = useCallback(
    async (id: number, status: StatusType | undefined) => {
      // No reload after the write: the new value is known, and a reload makes lists and menus blink.
      await mutate(status === undefined ? removeStatus(kind, id) : setStatus(kind, id, status), {
        shouldRevalidateAfter: false,
        optimisticUpdate: (current) => {
          const updated = new Map(current);
          if (status === undefined) {
            updated.delete(id);
          } else {
            updated.set(id, status);
          }
          return updated;
        },
      });
    },
    [kind, mutate],
  );

  return { statuses, isLoading, changeStatus };
};
