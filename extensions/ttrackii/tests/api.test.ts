import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  api,
  entries,
  report,
  resources,
  session,
  signOut,
  startTimer,
  timer,
} from "../src/lib/api";
import {
  accessToken,
  origin,
  read,
  saveSnapshot,
  SignedOutError,
  tokenStore,
  write,
} from "../src/lib/store";
import { credentials, environment, preferences, values } from "./raycast-mock";
const fetcher = vi.fn();
beforeEach(async () => {
  vi.clearAllMocks();
  credentials.clear();
  for (const key in values) delete values[key];
  preferences.serverUrl = "https://app.ttrackii.com";
  vi.stubGlobal("fetch", fetcher);
  await tokenStore().setTokens({ accessToken: "synthetic-session" });
});
afterEach(() => vi.unstubAllGlobals());
describe("account lifecycle and caching", () => {
  it("clears credentials and account data after a 401", async () => {
    await saveSnapshot("timer", { running: true });
    await write("workspace", "team");
    fetcher.mockResolvedValue(Response.json({}, { status: 401 }));
    await expect(timer()).rejects.toBeInstanceOf(SignedOutError);
    expect(credentials.size).toBe(0);
    expect(Object.keys(values)).toHaveLength(0);
  });
  it("does not reuse cached account data after Raycast removes the token", async () => {
    await saveSnapshot("session", { user: { id: "old" }, workspaces: [] });
    credentials.clear();
    await expect(session()).rejects.toThrow("Sign in");
    expect(fetcher).not.toHaveBeenCalled();
    expect(Object.keys(values)).toHaveLength(0);
  });
  it("keeps credentials and data separate between development and production", async () => {
    await write("workspace", "production-team");
    preferences.serverUrl = "http://localhost:3000";
    await expect(accessToken()).rejects.toThrow("Sign in");
    expect(await read("workspace")).toBeUndefined();
    preferences.serverUrl = "https://app.ttrackii.com";
    expect(await accessToken()).toBe("synthetic-session");
    expect(await read("workspace")).toBe("production-team");
  });
  it("uses the local app for a blank Server URL only in development builds", () => {
    preferences.serverUrl = "";
    expect(origin()).toBe("https://app.ttrackii.com");
    environment.isDevelopment = true;
    try {
      expect(origin()).toBe("http://localhost:3000");
      preferences.serverUrl = "https://staging.example.com";
      expect(origin()).toBe("https://staging.example.com");
    } finally {
      environment.isDevelopment = false;
    }
  });
  it("caches resource lookups per workspace", async () => {
    fetcher.mockImplementation(async () =>
      Response.json({ projects: [], tags: [] }),
    );
    await resources("personal");
    await resources("personal");
    await resources("team");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("revokes only the Raycast session and clears local data", async () => {
    await write("workspace", "team");
    fetcher.mockResolvedValue(Response.json({ success: true }));
    expect(await signOut()).toEqual({ revoked: true });
    expect(fetcher).toHaveBeenCalledWith(
      "https://app.ttrackii.com/api/auth/sign-out",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer synthetic-session",
        }),
      }),
    );
    expect(credentials.size).toBe(0);
    expect(Object.keys(values)).toHaveLength(0);
  });
  it("clears local data even when remote revocation fails", async () => {
    await write("workspace", "team");
    fetcher.mockRejectedValue(new Error("Offline"));
    expect(await signOut()).toEqual({ revoked: false });
    expect(credentials.size).toBe(0);
    expect(Object.keys(values)).toHaveLength(0);
  });
});
describe("timer, reports and quota", () => {
  it("saves the authoritative switched timer without retrying start", async () => {
    fetcher.mockResolvedValue(
      Response.json({
        running: true,
        entry: { id: "new" },
        elapsedMs: 0,
        asOf: "2026-10-07T00:00:00Z",
      }),
    );
    await startTimer({
      workspaceId: "personal",
      taskName: "New task",
      projectId: null,
      tagIds: ["t2", "t1"],
      billing: { mode: "none" },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
      tagIds: ["t2", "t1"],
      billing: { mode: "none" },
    });
    expect(await read("timer")).toMatchObject({
      data: { running: true, entry: { id: "new" } },
    });
  });
  it("reserves the last five requests for interactive commands", async () => {
    await write("rate", { remaining: 5, resetAt: Date.now() + 60000 });
    await expect(timer(true)).rejects.toMatchObject({ status: 429 });
    expect(fetcher).not.toHaveBeenCalled();
    fetcher.mockResolvedValue(Response.json({ running: false }));
    await api("/api/v1/timer");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("backs off after a server 429", async () => {
    fetcher.mockResolvedValue(
      Response.json({}, { status: 429, headers: { "Retry-After": "60" } }),
    );
    await expect(timer()).rejects.toMatchObject({ status: 429 });
    await expect(timer()).rejects.toMatchObject({ status: 429 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("requests only personal report totals for a date range", async () => {
    fetcher.mockResolvedValue(
      Response.json({
        summary: { totalDurationMs: 0 },
        entries: [],
        nextCursor: null,
      }),
    );
    await report("team/id", "2026-10-01", "2026-10-07");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("scope")).toBe("mine");
    expect(url.searchParams.get("workspaceId")).toBe("team/id");
    expect(url.searchParams.get("from")).toBe("2026-10-01");
    expect(url.searchParams.get("to")).toBe("2026-10-07");
  });
  it("searches recent entries and encodes pagination cursors", async () => {
    fetcher.mockResolvedValue(Response.json({ entries: [], nextCursor: null }));
    await entries("personal", "design & review", "cursor+=/");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.pathname).toBe("/api/v1/entries");
    expect(url.searchParams.get("q")).toBe("design & review");
    expect(url.searchParams.get("cursor")).toBe("cursor+=/");
  });
});
