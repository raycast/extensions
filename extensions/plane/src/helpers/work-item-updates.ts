import type { WorkItemChange, WorkItemSummary } from "../api/types";
import { applyWorkItemChange } from "./work-item-summary";

/**
 * Applies a change optimistically to whatever data the list holds, then awaits `request`. It must not reload:
 * the caller reloads once afterwards (`sendWorkItemUpdate`), so pass `OPTIMISTIC_ONLY` to `mutate`.
 */
export type WorkItemMutator = (
  workItemId: string,
  request: Promise<unknown>,
  change: WorkItemChange,
) => Promise<unknown>;

/** `mutate` options for an optimistic update whose reload happens elsewhere. A failure still rolls back. */
export const OPTIMISTIC_ONLY = { shouldRevalidateAfter: false } as const;

type ArrayMutate = (
  asyncUpdate?: Promise<unknown>,
  options?: {
    optimisticUpdate?: (data: WorkItemSummary[] | undefined) => WorkItemSummary[];
    shouldRevalidateAfter?: boolean;
  },
) => Promise<unknown>;

/** Builds a `WorkItemMutator` for hooks whose data is a `WorkItemSummary[]`. */
export function arrayMutator(mutate: ArrayMutate): WorkItemMutator {
  return (workItemId, request, change) =>
    mutate(request, {
      ...OPTIMISTIC_ONLY,
      optimisticUpdate: (data) =>
        (data ?? []).map((item) => (item.id === workItemId ? applyWorkItemChange(item, change) : item)),
    });
}

/**
 * Sends a work item update: optimistically through `mutate` when given (otherwise the request is just awaited),
 * then reloads once through `reload`. On failure the optimistic change is rolled back and the error is thrown
 * without a reload.
 */
export async function sendWorkItemUpdate({
  workItemId,
  request,
  change,
  mutate,
  reload,
}: {
  workItemId: string;
  request: Promise<unknown>;
  change: WorkItemChange;
  mutate?: WorkItemMutator;
  reload?: () => void;
}): Promise<void> {
  if (mutate) {
    await mutate(workItemId, request, change);
  } else {
    await request;
  }
  reload?.();
}
