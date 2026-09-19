import { createHash, randomUUID } from "node:crypto";
import { Cache, getPreferenceValues, LaunchType, LocalStorage, launchCommand } from "@raycast/api";
import { ApiError, type MutationResult, type Operation, TrackTimerApi } from "./api";
import { cachedApi } from "./cached-api";
import { withOperationLock } from "./operation-lock";
import { QueryCache } from "./query-cache";

const TRACKTIMER_URL = "https://www.tracktimer.app";

type Completion = {
  id: string;
  completedAt?: number;
  result?: MutationResult;
  error?: { message: string; uncertain: boolean; status?: number };
};

export function session() {
  const prefs = getPreferenceValues<{ apiToken: string }>();
  const baseUrl = TRACKTIMER_URL;
  const api = new TrackTimerApi({ baseUrl, token: prefs.apiToken });
  const connectionId = createHash("sha256")
    .update(`${baseUrl}\0${prefs.apiToken.trim()}`)
    .digest("hex");
  const key = `pending-${connectionId}`;
  const completionKey = `completion-${connectionId}`;
  const queries = cachedApi(api, new QueryCache(new Cache({ namespace: `queries-v1-${key}` })));
  const pending = async (): Promise<Operation | null> => {
    const stored = await LocalStorage.getItem<string>(key);
    return stored ? (JSON.parse(stored) as Operation) : null;
  };
  const completion = async (id: string): Promise<Completion | null> => {
    const stored = await LocalStorage.getItem<string>(`${completionKey}-${id}`);
    return stored ? (JSON.parse(stored) as Completion) : null;
  };
  async function refreshMenuBar() {
    try {
      if (await LocalStorage.getItem<boolean>("menu-bar-enabled"))
        await launchCommand({ name: "menu-bar", type: LaunchType.Background });
    } catch {
      /* Disabled menu commands must not affect successful timer actions. */
    }
  }
  return {
    ...queries,
    baseUrl,
    connectionId,
    pending,
    /** Only the independent no-view command sends mutations. */
    async processPending(expectedId?: string, expectedConnectionId?: string) {
      if (expectedConnectionId && expectedConnectionId !== connectionId) return;
      // Serialize sending with replacement: a superseded worker must never send
      // its old action after the user's newer choice has been saved.
      await withOperationLock(connectionId, async () => {
        const operation = await pending();
        if (!operation || (expectedId && operation.id !== expectedId)) return;
        const previous = await completion(operation.id);
        if (previous?.id === operation.id && previous.result) {
          await LocalStorage.removeItem(key);
          return;
        }
        const started = performance.now();
        try {
          const result = await api.mutate(operation);
          // Publish confirmation before clearing the pending record. A killed worker
          // can then be reconciled without sending the mutation a second time.
          if ((await pending())?.id !== operation.id) return;
          queries.confirmTimer(result.timer);
          await LocalStorage.setItem(
            `${completionKey}-${operation.id}`,
            JSON.stringify({ id: operation.id, completedAt: Date.now(), result }),
          );
          await LocalStorage.removeItem(key);
          console.info("TrackTimer mutation timing", {
            stage: "worker_confirmed",
            durationMs: Math.round(performance.now() - started),
          });
        } catch (error) {
          // Another worker may have confirmed the same idempotent operation.
          if (
            (await completion(operation.id))?.id === operation.id &&
            (await completion(operation.id))?.result
          )
            return;
          queries.invalidateTimers();
          const failure =
            error instanceof ApiError
              ? error
              : new ApiError(
                  "The timer action could not be confirmed. Retry the pending action.",
                  true,
                );
          if ((await pending())?.id !== operation.id || (await completion(operation.id))?.result)
            return;
          await LocalStorage.setItem(
            `${completionKey}-${operation.id}`,
            JSON.stringify({
              id: operation.id,
              completedAt: Date.now(),
              error: {
                message: failure.message,
                uncertain: failure.uncertain,
                status: failure.status,
              },
            }),
          );
          if (!failure.uncertain) await LocalStorage.removeItem(key);
          console.info("TrackTimer mutation timing", {
            stage: "worker_failed",
            durationMs: Math.round(performance.now() - started),
            status: failure.status,
          });
          throw failure;
        }
      });
      await refreshMenuBar();
    },
    async execute(path?: string, body?: Operation["body"]) {
      const started = performance.now();
      const queued = await withOperationLock(connectionId, async () => {
        const stored = await pending();
        for (const [itemKey, value] of Object.entries(await LocalStorage.allItems())) {
          if (
            !itemKey.startsWith(`${completionKey}-`) ||
            itemKey === `${completionKey}-${stored?.id}` ||
            typeof value !== "string"
          )
            continue;
          const saved = JSON.parse(value) as Completion;
          if ((saved.completedAt ?? 0) < Date.now() - 86_400_000)
            await LocalStorage.removeItem(itemKey);
        }
        // An explicit new choice replaces an unconfirmed action; only Retry
        // reuses its idempotency key. Workers re-check the ID under this lock.
        const operation: Operation = (!path && stored) || {
          id: randomUUID(),
          path: path ?? "",
          ...(body ? { body } : {}),
        };
        if (!operation.path) throw new Error("No pending timer action to retry.");
        const previous = !path && stored ? await completion(stored.id) : null;
        if (!path && stored && previous?.id === stored.id && previous.result) {
          await LocalStorage.removeItem(key);
          queries.confirmTimer(previous.result.timer);
          return { confirmed: previous.result };
        }
        await LocalStorage.removeItem(`${completionKey}-${operation.id}`);
        await LocalStorage.setItem(key, JSON.stringify(operation));
        queries.invalidateTimers();
        return { operation };
      });
      if (queued.confirmed) return queued.confirmed;
      const operation = queued.operation;
      if (!operation) throw new Error("No saved timer action.");
      try {
        await launchCommand({
          name: "process-timer",
          type: LaunchType.Background,
          context: { operationId: operation.id, connectionId },
        });
      } catch {
        throw new ApiError(
          "The background timer action could not be launched. Reopen TrackTimer and retry the pending action.",
          true,
        );
      }
      console.info("TrackTimer mutation timing", {
        stage: "background_handoff",
        durationMs: Math.round(performance.now() - started),
      });
      // This view may disappear at any point. The worker owns sending, recording
      // confirmation, and refreshing the menu bar independently of this waiter.
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        const saved = await completion(operation.id);
        if (saved?.id === operation.id) {
          if (saved.result) {
            queries.confirmTimer(saved.result.timer);
            return saved.result;
          }
          if (saved.error)
            throw new ApiError(saved.error.message, saved.error.uncertain, saved.error.status);
        }
        if ((await pending())?.id !== operation.id && !(await completion(operation.id)))
          throw new ApiError("This action was replaced by a newer timer choice.");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      throw new ApiError(
        "The background timer action is still unconfirmed. Reopen TrackTimer to check or retry the pending action.",
        true,
      );
    },
  };
}
