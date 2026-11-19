import type { Action, Receipt, ReceiptStatus } from "./contract";
import { IntegrationError } from "./errors";
import type { PendingRequest } from "./transport";

export interface TrackedRequest extends PendingRequest {
  status: ReceiptStatus | "unconfirmed" | "unavailable";
}

export async function reconcilePendingRequests(
  requests: PendingRequest[],
  dependencies: {
    readReceipt: (pending: PendingRequest) => Promise<Receipt | undefined>;
    forgetPending: (pending: PendingRequest) => Promise<void>;
    signal?: AbortSignal;
  },
): Promise<TrackedRequest[]> {
  const remaining: TrackedRequest[] = [];
  const checkCancellation = () => {
    if (dependencies.signal?.aborted) throw new IntegrationError("cancelled");
  };

  checkCancellation();
  for (const pending of requests) {
    checkCancellation();
    let tracked: TrackedRequest = { ...pending, status: "unconfirmed" };
    try {
      const receipt = await dependencies.readReceipt(pending);
      checkCancellation();
      if (receipt) {
        tracked = {
          ...pending,
          payloadHash: receipt.payloadHash,
          receiptRevision: receipt.receiptRevision,
          status: receipt.status,
        };
        if (receipt.status === "succeeded" || receipt.status === "cancelled") {
          await dependencies.forgetPending(pending);
          checkCancellation();
          continue;
        }
      }
    } catch {
      checkCancellation();
      tracked.status = "unavailable";
    }
    remaining.push(tracked);
  }
  return remaining;
}

const ACTION_TITLES: Record<Action, string> = {
  refreshState: "Refresh Shared State",
  reviewAddURL: "Add Download",
  showTask: "Show in HarborDrop",
  revealTask: "Reveal in Finder",
};

const STATUS_TEXT: Record<TrackedRequest["status"], string> = {
  accepted: "Waiting for HarborDrop",
  awaitingUser: "Needs Your Approval",
  executing: "Processing in HarborDrop",
  succeeded: "Request Completed",
  cancelled: "Request Cancelled",
  rejected: "Request Declined — Check Details",
  expired: "Request Expired — Check Details",
  failed: "Request Failed — Check Details",
  reconciliationRequired: "Needs Review in HarborDrop",
  unconfirmed: "Result Not Confirmed",
  unavailable: "Unable to Check Request — Try Again",
};

export function requestPresentation(request: TrackedRequest): {
  title: string;
  subtitle: string;
} {
  return {
    title: ACTION_TITLES[request.action],
    subtitle: STATUS_TEXT[request.status],
  };
}
