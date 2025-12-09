import { showToast, Toast } from "@raycast/api";
import { assign, createMachine, fromCallback, fromPromise, type StateFrom, type StateValueMap } from "xstate";
import { homedir } from "node:os";
import { isSnapshotAvailable, invalidateSnapshot, hydrateSnapshot, persistSnapshot } from "../utils/cache";
import fileSystemIndexStore from "../stores/file-system-index-store";
import { fetchVolume, indexHomeDirectory } from "../utils/scan";
import selectionStore from "../stores/selection-store";
import type { DiskUsageContext, DiskUsageEvent } from "../types";
import { pruneFileSystemIndex, adjustVolume } from "../utils/calc";

export type DiskUsageState = StateFrom<typeof diskUsageMachine>;
export type DiskUsageSend = (event: DiskUsageEvent) => void;

export const matchStatus = <C, R>(
  stateValue: string | StateValueMap,
  context: C,
  patterns: Record<string, (ctx: C) => R> & {
    _?: (ctx: C) => R;
  },
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
    fsIndex: {},
    volume: { freeBytes: 0, totalBytes: 0, usageLabel: "0%" },
  } as DiskUsageContext,
  states: {
    checkingCache: {
      invoke: {
        src: fromPromise(isSnapshotAvailable),
        onDone: [
          {
            target: "restoringCache",
            guard: ({ event }) => event.output === true,
          },
          { target: "loadingUsage" },
        ],
        onError: { target: "loadingUsage" },
      },
    },

    restoringCache: {
      invoke: {
        src: fromPromise(hydrateSnapshot),
        onDone: [
          {
            guard: ({ event }) => !!event.output,
            target: "ready",
            actions: [
              assign({
                fsIndex: ({ event }) => event.output!.fsIndex,
                volume: ({ event }) => event.output!.volume,
              }),
              ({ event }) => fileSystemIndexStore.set(event.output!.fsIndex),
            ],
          },
          { target: "loadingUsage" },
        ],
        onError: { target: "loadingUsage" },
      },
    },

    loadingUsage: {
      invoke: {
        src: fromPromise(fetchVolume),
        onDone: {
          target: "scanning",
          actions: assign({ volume: ({ event }) => event.output }),
        },
        onError: {
          target: "error",
          actions: assign({ error: "Failed to load disk usage" }),
        },
      },
    },

    scanning: {
      invoke: {
        src: fromCallback(({ sendBack }: { sendBack: DiskUsageSend; input: { homeDir: string } }) => {
          indexHomeDirectory(homedir(), (path) => sendBack({ type: "SCAN_PROGRESS", path }))
            .then((data) => sendBack({ type: "SCAN_SUCCESS", data }))
            .catch((error) => sendBack({ type: "SCAN_FAILURE", error }));
          return () => {};
        }),
      },
      on: {
        SCAN_PROGRESS: {
          actions: assign({ activePath: ({ event }) => event.path }),
        },
        SCAN_SUCCESS: {
          target: "ready",
          actions: [
            assign({
              activePath: "",
              fsIndex: ({ event }) => event.data,
            }),
            ({ event }) => fileSystemIndexStore.set(event.data),
            ({ event, context }) => persistSnapshot(event.data, context.volume),
          ],
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
          target: "loadingUsage",
          actions: [() => invalidateSnapshot(), () => fileSystemIndexStore.set(null)],
        },
        RETRY: "loadingUsage",
      },
      states: {
        idle: {
          on: {
            DELETE_ITEMS: "deleting",
          },
        },
        deleting: {
          entry: assign({ isProcessingDeletion: true }),
          invoke: {
            src: fromPromise(async ({ input }: { input: { paths: string[] } }) => {
              return input.paths;
            }),
            input: ({ event }) => ({
              paths: event.type === "DELETE_ITEMS" ? event.paths : [],
            }),
            onDone: {
              target: "idle",
              actions: [
                assign({
                  isProcessingDeletion: false,
                  volume: ({ context, event }) => {
                    const currentFsIndex = fileSystemIndexStore.get();
                    if (!currentFsIndex) return context.volume;

                    const { index, freedBytes } = pruneFileSystemIndex(context.fsIndex, event.output, homedir());
                    const volume = adjustVolume(context.volume, freedBytes);

                    fileSystemIndexStore.set(index);
                    persistSnapshot(index, volume);

                    return volume;
                  },
                }),
                () => {
                  selectionStore.clear();
                  showToast({
                    title: "Moved to Trash",
                    message: "Space reclaimed",
                  });
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
                    message: "Failed to delete items",
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
