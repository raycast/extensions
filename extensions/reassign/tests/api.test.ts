import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/lib/oauth", () => ({
  getAccessToken: vi.fn(async () => "token"),
  NotAuthorizedError: class extends Error {},
  SignedOutError: class extends Error {},
}));
import { getSchedule, getScheduleWithBacklog, rebaseOnSeries, sendFeedback, writeEvents } from "../src/lib/api";
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
it("loads all Inbox pages, retaining date and includeBacklog", async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ backlogCount: 51, backlog: [{ id: "first" }], nextBacklogOffset: 50 }))
    .mockResolvedValueOnce(Response.json({ backlog: [{ id: "last" }], nextBacklogOffset: null }));
  const result = await getScheduleWithBacklog("2026-09-21");
  expect(result).toMatchObject({ ok: true, data: { backlog: [{ id: "first" }, { id: "last" }] } });
  expect(Object.fromEntries(new URL(fetchMock.mock.calls[1][0]).searchParams)).toEqual({
    from: "2026-09-21",
    to: "2026-09-21",
    includeBacklog: "true",
    backlogOffset: "50",
  });
});
it("reports a failed later page instead of presenting an incomplete Inbox", async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ backlog: [], nextBacklogOffset: 50 }))
    .mockResolvedValueOnce(Response.json({ error: { code: "rate_limited" } }, { status: 429 }));
  expect(await getScheduleWithBacklog("2026-09-21")).toMatchObject({ ok: false, code: "rate_limited" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("rejects a non-advancing cursor", async () => {
  fetchMock.mockImplementation(async () => Response.json({ backlog: [], nextBacklogOffset: 50 }));
  expect(await getScheduleWithBacklog("2026-09-21")).toMatchObject({ ok: false });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("sends the required feedback kind", async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  expect(await sendFeedback("The menu bar is helpful", "idea")).toEqual({ ok: true, data: undefined });
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    kind: "idea",
    message: "The menu bar is helpful",
    submissionId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
});
it("reads one day with from = to", async () => {
  fetchMock.mockResolvedValue(Response.json({ days: [] }));
  await getSchedule("2026-09-21");
  expect(Object.fromEntries(new URL(fetchMock.mock.calls[0][0]).searchParams)).toEqual({
    from: "2026-09-21",
    to: "2026-09-21",
  });
});
it("sends every write as ops to POST /events", async () => {
  fetchMock.mockResolvedValue(Response.json({ results: [] }));
  await writeEvents([{ op: "update", id: "id", end: "11:00" }]);
  expect(fetchMock.mock.calls[0][0]).toBe("https://reassign.app/api/v1/events");
  expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ ops: [{ op: "update", id: "id", end: "11:00" }] });
});
it("reads the failed row of a rejected atomic batch", async () => {
  fetchMock.mockResolvedValue(
    Response.json(
      {
        error: { code: "validation", message: "The batch was rejected." },
        results: [
          { index: 0, status: "skipped", reason: "atomic" },
          { index: 1, status: "error", error: { code: "conflict", message: "Time occupied" } },
        ],
      },
      { status: 409 },
    ),
  );
  expect(await writeEvents([{ op: "update", id: "id", end: "11:00" }])).toMatchObject({
    ok: false,
    code: "conflict",
    message: "Time occupied",
  });
});
it("reads the plain error envelope", async () => {
  fetchMock.mockResolvedValue(Response.json({ error: { code: "not_found", message: "No block" } }, { status: 404 }));
  expect(await writeEvents([{ op: "delete", id: "id" }])).toMatchObject({
    ok: false,
    code: "not_found",
    message: "No block",
  });
});
it("always asks AI for a preview without applying changes", async () => {
  const { previewBlock } = await import("../src/lib/api");
  fetchMock.mockResolvedValue(Response.json({ intents: [] }));
  await previewBlock("deep work tomorrow morning");
  expect(fetchMock.mock.calls[0][0]).toBe("https://reassign.app/api/v1/command");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    input: "deep work tomorrow morning",
    mode: "line",
    apply: false,
  });
});
it("moves an occurrence change onto the series anchor by the same wall minutes", async () => {
  fetchMock.mockResolvedValue(
    Response.json({ series: [{ id: "series", start: "2026-09-01T09:00", end: "2026-09-01T10:00" }] }),
  );
  const occurrence = { date: "2026-09-21", start: "2026-09-21T09:00", end: "2026-09-21T10:00" };
  expect(await rebaseOnSeries("series", occurrence, { start: "2026-09-21T11:30", end: "2026-09-21T10:15" })).toEqual({
    ok: true,
    data: { start: "2026-09-01T11:30", end: "2026-09-01T10:15" },
  });
  expect(Object.fromEntries(new URL(fetchMock.mock.calls[0][0]).searchParams)).toEqual({
    from: "2026-09-21",
    to: "2026-09-21",
    includeSeries: "true",
  });
  fetchMock.mockResolvedValue(Response.json({ series: [] }));
  expect(await rebaseOnSeries("series", occurrence, { start: "2026-09-21T11:30" })).toMatchObject({
    ok: false,
    code: "not_found",
  });
});
it("gives the series the chosen clock and length, also from a changed occurrence", async () => {
  fetchMock.mockImplementation(async () =>
    Response.json({ series: [{ id: "series", start: "2026-09-01T09:00", end: "2026-09-01T10:00" }] }),
  );
  // The 09-21 occurrence was moved to 09-22 14:00 on its own; the user now moves
  // it to 09-23 14:30. The days count from the original date in its id.
  const edited = { date: "2026-09-21", start: "2026-09-22T14:00", end: "2026-09-22T15:00" };
  expect(await rebaseOnSeries("series", edited, { start: "2026-09-23T14:30" })).toEqual({
    ok: true,
    data: { start: "2026-09-03T14:30" },
  });
  // A new end keeps the series start and takes the new length (90 minutes).
  expect(await rebaseOnSeries("series", edited, { end: "2026-09-22T15:30" })).toEqual({
    ok: true,
    data: { end: "2026-09-01T10:30" },
  });
});
it("retries a 503 once for a read, but never for a plain write", async () => {
  const busy = () => Response.json({ error: { code: "internal", message: "Busy" } }, { status: 503 });
  fetchMock.mockImplementation(async () => busy());
  expect(await writeEvents([{ op: "shift", id: "id", byMinutes: 15 }])).toMatchObject({ ok: false, code: "internal" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(busy()).mockResolvedValueOnce(Response.json({ days: [] }));
  expect(await getSchedule("2026-09-21")).toMatchObject({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
