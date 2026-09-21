import { afterEach, describe, expect, it, vi } from "vitest";
import { type ActiveTimer, ApiError, type TimeEntry, TrackTimerApi } from "./api";
import { cachedApi } from "./cached-api";
import { QueryCache } from "./query-cache";

const timer: ActiveTimer = {
  id: "timer-1",
  clientId: "client-1",
  clientName: "Acme",
  projectId: "project-1",
  projectName: "Website",
  billable: true,
  note: "Design review",
  startedAt: "2026-09-10T12:00:00.000Z",
  serverNow: "2026-09-10T12:01:00.000Z",
  elapsedSeconds: 60,
  payRateCents: 10000,
  currency: "USD",
};
const entry: TimeEntry = {
  ...timer,
  status: "completed",
  endedAt: "2026-09-10T12:01:00.000Z",
  durationSeconds: 60,
  earnings: "1.67",
};
const history = { entries: [entry], nextCursor: "older-page" };

function setup() {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-10T12:01:00.000Z"));
  const storage = new Map<string, string>();
  const cache = new QueryCache({
    get: (key) => storage.get(key),
    set: (key, value) => {
      storage.set(key, value);
    },
    remove: (key) => {
      storage.delete(key);
    },
    clear: () => storage.clear(),
  });
  const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/summary"))
      return Response.json({ trackedSeconds: 60, earnings: [] });
    if (url.pathname.endsWith("/timer")) return Response.json({ timer });
    if (url.pathname.endsWith("/time-entries")) return Response.json(history);
    if (url.pathname.endsWith("/clients"))
      return Response.json({ clients: [{ id: "client-1", name: "Acme" }] });
    if (url.pathname.endsWith("/projects"))
      return Response.json({
        projects: [{ id: "project-1", name: "Website", clientId: "client-1" }],
      });
    throw new Error("Unexpected request");
  });
  const source = new TrackTimerApi({
    baseUrl: "http://localhost:3001",
    token: "test-token",
    fetch: fetcher,
  });
  return { ...cachedApi(source, cache), cache, fetcher };
}

afterEach(() => vi.useRealTimers());

it("does not resurrect an old timer when a read finishes after stop confirmation", async () => {
  const { api, confirmTimer, fetcher } = setup();
  let finish!: (response: Response) => void;
  fetcher.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const reading = api.getTimer(true);
  await Promise.resolve();
  confirmTimer(null);
  finish(Response.json({ timer }));
  await expect(reading).resolves.toBeNull();
});

describe("cached TrackTimer API", () => {
  it("serves recent timers on reopening without another GET while fresh", async () => {
    const { api, cached, fetcher } = setup();
    expect(cached.entries()).toBeUndefined();
    expect(await api.getEntries()).toEqual(history);
    vi.advanceTimersByTime(59_000);
    expect(cached.entries()).toEqual(history);
    expect(await api.getEntries()).toEqual(history);
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    await api.getEntries();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("advances a cached running timer without counting elapsed time twice", async () => {
    const { api, cached, fetcher } = setup();
    expect(await api.getTimer()).toEqual(timer);
    vi.advanceTimersByTime(5_500);
    expect(cached.timer()?.elapsedSeconds).toBe(65);
    expect((await api.getTimer())?.elapsedSeconds).toBe(65);
    vi.advanceTimersByTime(2_000);
    expect(cached.timer()?.elapsedSeconds).toBe(67);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("caches the absence of a running timer", async () => {
    const { api, cached, fetcher } = setup();
    fetcher.mockResolvedValue(Response.json({ timer: null }));
    expect(await api.getTimer()).toBeNull();
    expect(cached.timer()).toBeNull();
    expect(await api.getTimer()).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("lets an explicit refresh bypass fresh history", async () => {
    const { api, cached, fetcher } = setup();
    await api.getEntries();
    fetcher.mockResolvedValue(Response.json({ entries: [], nextCursor: null }));
    expect(await api.getEntries(undefined, true)).toEqual({ entries: [], nextCursor: null });
    expect(cached.entries()?.entries).toEqual([]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("invalidates timer and recent history after a mutation but retains project lists", async () => {
    const { api, cached, invalidateTimers, fetcher } = setup();
    await Promise.all([
      api.getTimer(),
      api.getEntries(),
      api.getClients(),
      api.getProjects("client-1"),
    ]);
    invalidateTimers();
    expect(cached.timer()).toBeUndefined();
    expect(cached.entries()).toBeUndefined();
    expect(cached.clients()).toHaveLength(1);
    expect(cached.projects("client-1")).toHaveLength(1);
    await Promise.all([
      api.getTimer(),
      api.getEntries(),
      api.getClients(),
      api.getProjects("client-1"),
    ]);
    expect(fetcher).toHaveBeenCalledTimes(6);
  });

  it.each([401, 403])("purges account data when refresh receives HTTP %s", async (status) => {
    const { api, cached, fetcher } = setup();
    await Promise.all([
      api.getTimer(),
      api.getEntries(),
      api.getClients(),
      api.getProjects("client-1"),
    ]);
    fetcher.mockResolvedValue(new Response("Denied", { status }));
    await expect(api.getTimer(true)).rejects.toBeInstanceOf(ApiError);
    expect(cached.timer()).toBeUndefined();
    expect(cached.entries()).toBeUndefined();
    expect(cached.clients()).toBeUndefined();
    expect(cached.projects("client-1")).toBeUndefined();
  });

  it("retains cached history after a transient server failure", async () => {
    const { api, cached, fetcher } = setup();
    await api.getEntries();
    fetcher.mockResolvedValue(new Response("Unavailable", { status: 500 }));
    await expect(api.getEntries(undefined, true)).rejects.toMatchObject({ status: 500 });
    expect(cached.entries()).toEqual(history);
  });
});

it("reuses daily totals during fast polling and refreshes on expiry, mutation, or timezone change", async () => {
  const { getSummary, cached, invalidateTimers, fetcher } = setup();
  await getSummary("UTC");
  expect(cached.summary("UTC")).toEqual({ trackedSeconds: 60, earnings: [] });
  expect(cached.summary("America/Panama")).toBeUndefined();
  vi.advanceTimersByTime(10_000);
  await getSummary("UTC");
  expect(fetcher).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(50_000);
  await getSummary("UTC");
  expect(fetcher).toHaveBeenCalledTimes(2);
  invalidateTimers();
  await getSummary("UTC");
  expect(fetcher).toHaveBeenCalledTimes(3);
  await getSummary("America/Panama");
  expect(fetcher).toHaveBeenCalledTimes(4);
  await getSummary("America/Panama", true);
  expect(fetcher).toHaveBeenCalledTimes(5);
});
