/** @jest-environment jsdom */
/// <reference lib="dom" />
import { act, createElement, Fragment } from "react";
import { createRoot, Root } from "react-dom/client";
import { Cache, showToast, Toast } from "@raycast/api";
import { execFile, ExecFileException } from "child_process";
import { useCCUsageDailyCli } from "./useCCUsageDailyCli";
import { REPORT_CACHE_NAMESPACE } from "../utils/usage-report";

jest.mock(
  "@raycast/api",
  () => {
    type Store = { values: Map<string, string>; listeners: Set<() => void> };
    const stores = new Map<string, Store>();
    return {
      Cache: class {
        private store: Store;
        constructor({ namespace = "" } = {}) {
          this.store = stores.get(namespace) ?? { values: new Map(), listeners: new Set() };
          stores.set(namespace, this.store);
        }
        get = (key: string) => this.store.values.get(key);
        set = (key: string, value: string) => {
          this.store.values.set(key, value);
          this.store.listeners.forEach((listener) => listener());
        };
        clear = () => {
          this.store.values.clear();
          this.store.listeners.forEach((listener) => listener());
        };
        subscribe = (listener: () => void) => {
          this.store.listeners.add(listener);
          return () => this.store.listeners.delete(listener);
        };
      },
      environment: { launchType: "userInitiated", isDevelopment: true, assetsPath: "/tmp/ccusage-test-assets" },
      LaunchType: { Background: "background" },
      Toast: { Style: { Failure: "failure" } },
      showToast: jest.fn().mockResolvedValue(undefined),
    };
  },
  { virtual: true },
);
jest.mock("child_process", () => ({ ...jest.requireActual("child_process"), execFile: jest.fn() }));
jest.mock("../preferences", () => ({
  preferences: { usageLimitsRefreshInterval: "60" },
  getCustomNpxPath: () => undefined,
  getUsageCommandConfiguration: () => ({ summarySections: ["daily"] }),
}));
jest.mock("../utils/exec-options", () => ({ getExecOptions: () => ({}) }));
jest.mock("../utils/ccusage-version", () => ({ getCcusageVersionSync: () => "20.0.35" }));

type Completion = (error: ExecFileException | null, stdout: string, stderr: string) => void;
type ReportState = ReturnType<typeof useCCUsageDailyCli>;
const cache = new Cache({ namespace: REPORT_CACHE_NAMESPACE });
let states: Record<string, ReportState>;
let pending: Completion[];
let root: Root | undefined;

const report = (cost: number) => {
  const totals = {
    inputTokens: 1,
    outputTokens: 2,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
    totalTokens: 3,
    totalCost: cost,
  };
  return { daily: [{ date: "2026-10-17", ...totals, modelsUsed: [], modelBreakdowns: [] }], totals };
};

function Consumer({ id }: { id: string }) {
  states[id] = useCCUsageDailyCli();
  return null;
}

async function mount() {
  await act(async () => {
    root = createRoot(document.createElement("div"));
    root.render(
      createElement(Fragment, null, createElement(Consumer, { id: "a" }), createElement(Consumer, { id: "b" })),
    );
  });
}

async function complete(cost: number) {
  await act(async () => pending.shift()!(null, JSON.stringify(report(cost)), ""));
}

async function fail() {
  await act(async () => pending.shift()!(new Error("offline"), "", ""));
}

async function advance(ms: number) {
  await act(async () => jest.advanceTimersByTime(ms));
}

beforeEach(() => {
  jest.useFakeTimers({ now: new Date(2026, 9, 17), doNotFake: ["queueMicrotask"] });
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  cache.clear();
  states = {};
  pending = [];
  jest.clearAllMocks();
  (execFile as unknown as jest.Mock).mockImplementation((_command, _args, _options, callback: Completion) => {
    pending.push(callback);
  });
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
    root = undefined;
    pending.splice(0).forEach((callback) => callback(null, JSON.stringify(report(0)), ""));
  });
  jest.useRealTimers();
});

it("shares pending work, broadcasts cache changes, refreshes after expiry, and stops after unmount", async () => {
  await mount();
  expect(execFile).toHaveBeenCalledTimes(1);
  await advance(120_000);
  expect(execFile).toHaveBeenCalledTimes(1);
  await complete(1);
  expect(states.a.data?.totals.totalCost).toBe(1);
  expect(states.b.data?.totals.totalCost).toBe(1);
  expect(states.a.isLoading).toBe(false);

  await advance(59_999);
  expect(execFile).toHaveBeenCalledTimes(1);
  await advance(1);
  expect(execFile).toHaveBeenCalledTimes(2);
  expect(states.a.data?.totals.totalCost).toBe(1);
  await complete(2);
  expect(states.a.data?.totals.totalCost).toBe(2);
  expect(states.b.data?.totals.totalCost).toBe(2);

  await act(async () => {
    cache.set("summary", JSON.stringify({ data: report(3), updatedAt: { daily: Date.now() } }));
  });
  expect(states.a.data?.totals.totalCost).toBe(3);
  expect(states.b.data?.totals.totalCost).toBe(3);

  await act(async () => {
    root?.unmount();
    root = undefined;
  });
  await advance(120_000);
  expect(execFile).toHaveBeenCalledTimes(2);
});

it("keeps cached data after failure and waits a full interval before retrying", async () => {
  await mount();
  await complete(1);
  await advance(60_000);
  await fail();
  expect(states.a.error).toBeDefined();
  expect(states.b.error).toBeDefined();
  expect(states.a.data?.totals.totalCost).toBe(1);
  expect(states.b.data?.totals.totalCost).toBe(1);
  await advance(59_999);
  expect(execFile).toHaveBeenCalledTimes(2);
  await advance(1);
  expect(execFile).toHaveBeenCalledTimes(3);
  await complete(2);
  expect(states.a.error).toBeUndefined();
  expect(states.b.data?.totals.totalCost).toBe(2);
});

it("forces a new request through the toast Retry action even when cached data is fresh", async () => {
  await mount();
  await complete(1);
  await act(async () => {
    void states.a.revalidate();
  });
  await fail();
  const options = jest.mocked(showToast as (options: Toast.Options) => Promise<Toast>).mock.calls.at(-1)![0];
  expect(options.primaryAction?.title).toBe("Retry");
  const hide = jest.fn();
  await act(async () => {
    void options.primaryAction?.onAction({ hide } as unknown as Toast);
  });
  expect(hide).toHaveBeenCalled();
  expect(execFile).toHaveBeenCalledTimes(3);
  await complete(2);
  expect(states.a.data?.totals.totalCost).toBe(2);
  expect(states.b.data?.totals.totalCost).toBe(2);
});

it("reuses a fresh persistent cache and waits for its remaining lifetime before refreshing", async () => {
  cache.set("summary", JSON.stringify({ data: report(9), updatedAt: { daily: Date.now() - 20_000 } }));
  await mount();
  expect(states.a.data?.totals.totalCost).toBe(9);
  expect(states.b.data?.totals.totalCost).toBe(9);
  expect(execFile).not.toHaveBeenCalled();
  await advance(39_999);
  expect(execFile).not.toHaveBeenCalled();
  await advance(1);
  expect(execFile).toHaveBeenCalledTimes(1);
  await complete(10);
});
