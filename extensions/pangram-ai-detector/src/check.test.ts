import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runCheck } from "./check";

let modelVersion: string;
let fetch: ReturnType<typeof vi.fn>;

/** Stubs the Pangram API: every task succeeds at once with the current `modelVersion`. */
beforeEach(() => {
  modelVersion = "4.0";
  fetch = vi.fn(async (url: string) =>
    Response.json(
      url.endsWith("/task")
        ? { task_id: "t1" }
        : {
            stage: "STAGE_SUCCESS",
            version: modelVersion,
            prediction_short: "Human",
            fraction_ai: 0,
            fraction_ai_assisted: 0,
            fraction_human: 1,
            windows: [],
          },
    ),
  );
  vi.stubGlobal("fetch", fetch);
});

afterEach(() => vi.unstubAllGlobals());

const checksSent = () => fetch.mock.calls.filter(([url]) => url.endsWith("/task")).length;

function options(store: Map<string, string>, overrides = {}) {
  return {
    apiKey: "key",
    model: "default",
    timeoutMs: 5_000,
    store,
    refresh: false,
    versionInvalidatesCache: true,
    ...overrides,
  };
}

describe("runCheck", () => {
  it("returns the Cached Result for the same trimmed text and Model", async () => {
    const store = new Map<string, string>();

    const first = await runCheck("Some text", options(store));
    const second = await runCheck("  Some text\n", options(store));

    expect(first.isCached).toBe(false);
    expect(second).toEqual({ ...first, isCached: true });
    expect(checksSent()).toBe(1);
  });

  it("skips the Cached Result on Refresh", async () => {
    const store = new Map<string, string>();

    await runCheck("Some text", options(store));
    const refreshed = await runCheck("Some text", options(store, { refresh: true }));

    expect(refreshed.isCached).toBe(false);
    expect(checksSent()).toBe(2);
  });

  it("reports a new Model Version and ignores Cached Results from older ones", async () => {
    const store = new Map<string, string>();

    const first = await runCheck("Old text", options(store));
    modelVersion = "4.1";
    const updated = await runCheck("New text", options(store));
    const repeat = await runCheck("Old text", options(store));

    expect(first.previousModelVersion).toBeUndefined();
    expect(updated.previousModelVersion).toBe("4.0");
    expect(repeat).toMatchObject({ isCached: false, result: { modelVersion: "4.1" } });
    expect(checksSent()).toBe(3);
  });

  it("keeps Cached Results from older Model Versions when invalidation is off", async () => {
    const store = new Map<string, string>();
    const keep = { versionInvalidatesCache: false };

    await runCheck("Old text", options(store, keep));
    modelVersion = "4.1";
    await runCheck("New text", options(store, keep));
    const repeat = await runCheck("Old text", options(store, keep));

    expect(repeat).toMatchObject({ isCached: true, result: { modelVersion: "4.0" } });
    expect(checksSent()).toBe(2);
  });

  it("calls beforeSend only when the Check will spend credits, and stops if it throws", async () => {
    const store = new Map<string, string>();
    const beforeSend = vi.fn(async () => {});

    await runCheck(" Some text ", options(store, { beforeSend }));
    await runCheck("Some text", options(store, { beforeSend }));
    const cancelled = runCheck("Other text", options(store, { beforeSend: () => Promise.reject(new Error("No")) }));

    expect(beforeSend).toHaveBeenCalledExactlyOnceWith("Some text");
    await expect(cancelled).rejects.toThrow("No");
    expect(checksSent()).toBe(1);
  });
});
