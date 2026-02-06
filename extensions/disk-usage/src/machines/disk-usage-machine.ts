import { homedir } from "node:os";
import path from "node:path";
import { showToast, Toast } from "@raycast/api";
import { assign, createMachine, fromCallback, fromPromise, StateFrom, StateValueMap } from "xstate";
import { refreshStore } from "../stores/refresh-store";
import selectionStore from "../stores/selection-store";
import type { DiskUsageContext, DiskUsageEvent } from "../types";
import { fetchVolume, indexHomeDirectory } from "../utils/scan";
import { clearCache, decreaseEntrySize, hasIndex, removeItemFromCache } from "../utils/storage";

export type DiskUsageState = StateFrom<typeof diskUsageMachine>;
export type DiskUsageSend = (event: DiskUsageEvent) => void;

export const matchStatus = <C, R>(
  stateValue: string | StateValueMap,
  context: C,
  patterns: Record<string, (ctx: C) => R> & { _?: (ctx: C) => R },
): R | null => {
  const statusKey = typeof stateValue === "string" ? stateValue : Object.keys(stateValue)[0];
  const handler = patterns[statusKey] ?? patterns._;
  return handler ? handler(context) : null;
};

export const diskUsageMachine = createMachine({
  id: "disk-usage",
  types: {} as { context: DiskUsageContext; events: DiskUsageEvent },
  initial: "checkingCache",
  context: {
    volume: { freeBytes: 0, totalBytes: 0, usageLabel: "0%" },
    activePath: "",
    heapUsed: "0 MB",
    needsScan: false,
  } as DiskUsageContext,
  states: {
    checkingCache: {
      invoke: {
        src: fromPromise(hasIndex),
        onDone: [
          { target: "loadingUsage", guard: ({ event }) => event.output === true },
          { target: "loadingUsage", actions: assign({ needsScan: true }) },
        ],
        onError: { target: "loadingUsage", actions: assign({ needsScan: true }) },
      },
    },
    loadingUsage: {
      invoke: {
        src: fromPromise(fetchVolume),
        onDone: [
          {
            target: "scanning",
            guard: ({ context }) => context.needsScan,
            actions: assign({ volume: ({ event }) => event.output }),
          },
          { target: "ready", actions: assign({ volume: ({ event }) => event.output }) },
        ],
        onError: { target: "ready" },
      },
    },
    scanning: {
      invoke: {
        src: fromCallback(({ sendBack }) => {
          indexHomeDirectory(homedir(), (path, heap) => sendBack({ type: "SCAN_PROGRESS", path, heap }))
            .then(() => sendBack({ type: "SCAN_SUCCESS" }))
            .catch((error) =>
              sendBack({ type: "SCAN_FAILURE", error: error instanceof Error ? error.message : String(error) }),
            );
          return () => {};
        }),
      },
      on: {
        SCAN_PROGRESS: {
          actions: assign({
            activePath: ({ event }) => event.path,
            heapUsed: ({ event }) => event.heap,
          }),
        },
        SCAN_SUCCESS: {
          target: "ready",
          actions: [assign({ activePath: "", needsScan: false }), () => refreshStore.triggerRefresh()],
        },
        SCAN_FAILURE: {
          target: "error",
          actions: assign({ error: "Scan failed" }),
        },
      },
    },
    ready: {
      initial: "idle",
      on: {
        REFRESH: {
          target: "scanning",
          actions: async () => await clearCache(),
        },
        RETRY: "loadingUsage",
        ITEM_MISSING: {
          actions: async ({ event }) => {
            if (event.type !== "ITEM_MISSING") return;
            const { path: filePath, bytes: removedBytes } = event;
            const home = homedir();

            await removeItemFromCache(filePath);

            let currentPath = filePath;
            while (currentPath.startsWith(home) && currentPath !== home) {
              const parent = path.dirname(currentPath);
              await decreaseEntrySize(parent, currentPath, removedBytes);
              currentPath = parent;
            }

            refreshStore.triggerRefresh();
          },
        },
      },
      states: {
        idle: {
          on: { DELETE_ITEMS: "deleting" },
        },
        deleting: {
          entry: assign({ isProcessingDeletion: true }),
          invoke: {
            src: fromPromise<void, { paths: string[] }>(async ({ input }) => {
              const home = homedir();
              for (const filePath of input.paths) {
                const removedBytes = await removeItemFromCache(filePath);
                if (removedBytes > 0) {
                  let currentPath = filePath;
                  while (currentPath.startsWith(home) && currentPath !== home) {
                    const parent = path.dirname(currentPath);
                    await decreaseEntrySize(parent, currentPath, removedBytes);
                    currentPath = parent;
                  }
                }
              }
            }),
            input: ({ event }) => ({
              paths: event.type === "DELETE_ITEMS" ? event.paths : [],
            }),
            onDone: {
              target: "idle",
              actions: [
                assign({ isProcessingDeletion: false }),
                () => {
                  selectionStore.clear();
                  refreshStore.triggerRefresh();
                  showToast({ title: "Moved to Trash", message: "Space reclaimed" });
                },
              ],
            },
            onError: {
              target: "idle",
              actions: [
                assign({ isProcessingDeletion: false }),
                () =>
                  showToast({
                    title: "Error",
                    message: "Failed to update cache",
                    style: Toast.Style.Failure,
                  }),
              ],
            },
          },
        },
      },
    },
    error: { on: { RETRY: "loadingUsage" } },
  },
});
