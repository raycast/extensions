import { randomUUID } from "crypto";
import { persistentAtom } from "zod-persist";
import { HistoryEntry, historySchema, ResponseData, NewRequest } from "../types";
import { createRaycastFileAdapter } from "../lib/adapters";
import { $currentEnvironmentId } from "./environments";

/**
 * A persistent atom to store an array of history entries.
 */
export const $history = persistentAtom([], {
  storage: createRaycastFileAdapter("request-history.json"),
  key: "request-history",
  schema: historySchema,
});

/**
 * Adds a new entry to the request history.
 * @param request The original request object that was run.
 * @param response The response data that was received.
 */
export async function addHistoryEntry(request: NewRequest, response: ResponseData, sourceRequestId?: string) {
  const newEntry: HistoryEntry = {
    id: randomUUID(),
    createdAt: new Date(),
    requestSnapshot: request,
    sourceRequestId,
    response,
    activeEnvironmentId: $currentEnvironmentId.get() ?? undefined,
  };

  // Add the new entry to the top of the list and keep up to 100 entries.
  const newHistory = [newEntry, ...$history.get()].slice(0, 100);

  historySchema.parse(newHistory);

  // Use .set() for a background save, which is fine for non-critical data like history.
  await $history.setAndFlush(newHistory);
}

/**
 * Deletes a single entry from the history log.
 * @param entryId The ID of the history entry to delete.
 */
export async function deleteHistoryEntry(entryId: string) {
  const newHistory = $history.get().filter((entry) => entry.id !== entryId);
  historySchema.parse(newHistory);
  await $history.setAndFlush(newHistory);
}

/**
 * Clears all entries from the history log.
 */
export async function clearHistory() {
  historySchema.parse([]);
  await $history.setAndFlush([]);
}
