import { HandoffReceipt, ReceiptPhase } from "./receipt-contract";

export type ReceiptStatusFilter = "all" | ReceiptPhase;

export const RECEIPT_STATUS_FILTER_LABELS: Record<ReceiptStatusFilter, string> =
  {
    all: "All Requests",
    accepted: "Awaiting Review",
    running: "Running",
    verificationPending: "Verification Pending",
    failed: "Failed",
    completed: "Completed",
    rejected: "Rejected",
    cancelled: "Cancelled",
  };

/** Filters recorded request phases; it never changes receipt trust or authorizes execution. */
export function filterHandoffReceipts(
  receipts: readonly HandoffReceipt[],
  {
    query = "",
    status = "all",
  }: { query?: string; status?: ReceiptStatusFilter } = {},
): HandoffReceipt[] {
  const search = query.trim().toLowerCase();
  return receipts
    .filter(
      (receipt) =>
        (status === "all" || receipt.phase === status) &&
        (!search ||
          [
            receipt.request.requestId,
            receipt.request.publisherSessionId,
            receipt.phase,
            RECEIPT_STATUS_FILTER_LABELS[receipt.phase],
            receipt.reason,
            ...receipt.targets.flatMap((entry) => [
              entry.target.bundleId,
              entry.target.canonicalPath,
              entry.target.caskToken,
              entry.phase,
              RECEIPT_STATUS_FILTER_LABELS[entry.phase],
              entry.reason,
            ]),
          ].some((value) => value?.toLowerCase().includes(search))),
    )
    .sort(
      (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
    );
}
