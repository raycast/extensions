import { LocalStorage } from "@raycast/api";
import { ACTIONS, Action, record, uuid } from "./contract";
import { PendingRequest, readReceipt } from "./transport";
import { IntegrationError } from "./errors";
import { PublicationError } from "./files";
import { reconcilePendingRequests, TrackedRequest } from "./request-tracking";

const PREFIX = "harbordrop-request:";
export async function savePending(pending: PendingRequest): Promise<void> {
  await LocalStorage.setItem(
    `${PREFIX}${uuid(pending.requestID)}`,
    JSON.stringify(pending),
  );
}
export async function forgetPending(pending: PendingRequest): Promise<void> {
  await LocalStorage.removeItem(`${PREFIX}${uuid(pending.requestID)}`);
}
export async function forgetUnpublished(
  pending: PendingRequest,
  error: unknown,
): Promise<boolean> {
  if (error instanceof PublicationError && error.mayBePublished) return false;
  await forgetPending(pending);
  return true;
}
export async function loadPending(): Promise<PendingRequest[]> {
  const items = await LocalStorage.allItems();
  const result: PendingRequest[] = [];
  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(PREFIX)) continue;
    if (typeof value !== "string") throw new IntegrationError("malformed");
    let parsed: Record<string, unknown>;
    try {
      parsed = record(JSON.parse(value));
    } catch {
      throw new IntegrationError("malformed");
    }
    if (
      !ACTIONS.includes(parsed.action as Action) ||
      typeof parsed.createdAt !== "number" ||
      !Number.isFinite(parsed.createdAt)
    )
      throw new IntegrationError("malformed");
    const requestID = uuid(parsed.requestID);
    if (key !== `${PREFIX}${requestID}`)
      throw new IntegrationError("malformed");
    result.push({
      requestID,
      namespaceEpoch: uuid(parsed.namespaceEpoch),
      producerInstanceID: uuid(parsed.producerInstanceID),
      action: parsed.action as Action,
      createdAt: parsed.createdAt,
    });
  }
  return result.sort((a, b) => b.createdAt - a.createdAt);
}

export async function loadTrackedRequests(
  signal?: AbortSignal,
): Promise<TrackedRequest[]> {
  return reconcilePendingRequests(await loadPending(), {
    readReceipt,
    forgetPending,
    signal,
  });
}
