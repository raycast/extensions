import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const files = new Map<string, string>();

vi.mock("fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  readFile: vi.fn(async (path: string) => {
    const value = files.get(path);
    if (value === undefined) {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }
    return value;
  }),
  rename: vi.fn(async (from: string, to: string) => {
    const value = files.get(from);
    if (value === undefined) {
      throw Object.assign(new Error("missing"), { code: "ENOENT" });
    }
    files.set(to, value);
    files.delete(from);
  }),
  writeFile: vi.fn(async (path: string, data: string) => {
    files.set(path, data);
  }),
  rm: vi.fn(async (path: string) => {
    files.delete(path);
  }),
}));

describe("stream-stop markers", () => {
  beforeEach(() => {
    files.clear();
    vi.resetModules();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("registers a session and clears stale stop markers", async () => {
    const { registerStreamSession, requestStreamStop, shouldStopStream } = await import("./stream-stop");

    await requestStreamStop("all");
    const sessionId = await registerStreamSession();

    expect(sessionId.length).toBeGreaterThan(0);
    expect(await shouldStopStream(sessionId)).toBe(false);
  });

  it("requests stop for a specific session", async () => {
    const { registerStreamSession, requestStreamStop, shouldStopStream } = await import("./stream-stop");

    const sessionId = await registerStreamSession();
    await requestStreamStop(sessionId);

    expect(await shouldStopStream(sessionId)).toBe(true);
    expect(await shouldStopStream("other-session")).toBe(false);
  });

  it("polls and aborts when a stop marker appears", async () => {
    const { registerStreamSession, requestStreamStop, startStreamStopPolling } = await import("./stream-stop");

    const sessionId = await registerStreamSession();
    const abortController = new AbortController();
    const stopPolling = startStreamStopPolling(sessionId, abortController, 10);

    await requestStreamStop("all");

    await vi.waitFor(() => {
      expect(abortController.signal.aborted).toBe(true);
    });

    stopPolling();
  });
});
