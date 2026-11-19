import { Operation } from "../types";
import { InstaBoxError, machinePath, request } from "./instabox";

export function startMachine(id: string) {
  return request<Operation>("POST", machinePath(id, "/start"), { body: {}, idempotent: true });
}

export function stopMachine(id: string) {
  return request<Operation>("POST", machinePath(id, "/stop"), { body: {}, idempotent: true });
}

export function pauseMachine(id: string) {
  return request<Operation>("POST", machinePath(id, "/suspend"), { idempotent: true });
}

export function resumeMachine(id: string) {
  return request<Operation>("POST", machinePath(id, "/resume"), { body: {}, idempotent: true });
}

export function getOperation(id: string, wait?: string) {
  return request<Operation>("GET", `/v1/operations/${encodeURIComponent(id)}`, { query: { wait } });
}

const OPERATION_TIMEOUT_MS = 15 * 60 * 1000;
const RETRY_DELAY_MS = 3000;

/** A network failure or an error the API marks `retryable`: the operation itself may still be fine. */
function isTransient(error: unknown) {
  if (error instanceof InstaBoxError) return error.retryable;
  return error instanceof TypeError && error.message === "fetch failed";
}

/**
 * Follows an operation with the API's long poll until it succeeds or fails, retrying a poll that
 * fails for a transient reason. Throws an `InstaBoxError` carrying the operation's error when it fails.
 */
export async function waitForOperation(operation: Operation, onProgress?: (operation: Operation) => void) {
  const deadline = Date.now() + OPERATION_TIMEOUT_MS;
  let current = operation;
  onProgress?.(current);
  while (current.state !== "succeeded" && current.state !== "failed") {
    if (Date.now() > deadline) {
      throw new Error("Timed out waiting for the operation; it may still finish on InstaBox");
    }
    try {
      current = await getOperation(current.id, "25s");
    } catch (error) {
      if (!isTransient(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }
    onProgress?.(current);
  }
  if (current.state === "failed") {
    throw new InstaBoxError(409, {
      code: current.error?.code ?? "operation_failed",
      message: current.error?.message ?? `The ${current.type} operation failed`,
      retryable: current.error?.retryable,
      operationId: current.id,
    });
  }
  return current;
}
