import { afterEach, beforeEach, expect, it, vi } from "vitest";
// session-lock reads `environment` only in a call; the test uses its error class.
vi.mock("@raycast/api", () => ({ environment: {} }));
vi.mock("../src/lib/oauth", () => {
  // Match the real hierarchy: SignedOutError is a NotAuthorizedError.
  class NotAuthorizedError extends Error {}
  class SignedOutError extends NotAuthorizedError {}
  return { getAccessToken: vi.fn(async () => "token"), NotAuthorizedError, SignedOutError };
});
import {
  bookSlot,
  getSchedule,
  getScheduleWithBacklog,
  getFreeSlots,
  previewBlock,
  rebaseOnSeries,
  sendFeedback,
  writeEvents,
} from "../src/lib/api";
import { getAccessToken, NotAuthorizedError, SignedOutError } from "../src/lib/oauth";
import { SessionLockTimeoutError } from "../src/lib/session-lock";
const fetchMock = vi.fn();
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  vi.mocked(getAccessToken).mockReset();
  vi.mocked(getAccessToken).mockImplementation(async () => "token");
});
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
    data: { start: "2026-09-01T11:30", end: "2026-09-01T10:15", anchorStart: "2026-09-01T09:00" },
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
    data: { start: "2026-09-03T14:30", anchorStart: "2026-09-01T09:00" },
  });
  // A new end keeps the series start and takes the new length (90 minutes).
  expect(await rebaseOnSeries("series", edited, { end: "2026-09-22T15:30" })).toEqual({
    ok: true,
    data: { end: "2026-09-01T10:30", anchorStart: "2026-09-01T09:00" },
  });
});
const busy = () => Response.json({ error: { code: "internal", message: "Busy" } }, { status: 503 });
/** Settle a request that waits on the 300 ms retry back-off. */
async function withFakeBackoff<T>(call: () => Promise<T>): Promise<T> {
  vi.useFakeTimers();
  const pending = call();
  await vi.advanceTimersByTimeAsync(300);
  return pending;
}
it("retries a 503 once for a read, but never for a plain write", async () => {
  fetchMock.mockImplementation(async () => busy());
  expect(await writeEvents([{ op: "shift", id: "id", byMinutes: 15 }])).toMatchObject({ ok: false, code: "internal" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fetchMock.mockReset();
  fetchMock.mockResolvedValueOnce(busy()).mockResolvedValueOnce(Response.json({ days: [] }));
  expect(await withFakeBackoff(() => getSchedule("2026-09-21"))).toMatchObject({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});
it("reports a session-lock timeout as a local failure, not as a network one", async () => {
  vi.mocked(getAccessToken).mockRejectedValueOnce(new SessionLockTimeoutError());
  expect(await getSchedule("2026-09-21")).toMatchObject({ ok: false, code: "internal" });
  vi.mocked(getAccessToken).mockResolvedValueOnce("old").mockRejectedValueOnce(new SessionLockTimeoutError());
  fetchMock.mockResolvedValue(Response.json({ error: { code: "unauthorized" } }, { status: 401 }));
  expect(await getSchedule("2026-09-21")).toMatchObject({ ok: false, code: "internal" });
});
it("maps a failed first token read to signed_out or unauthenticated", async () => {
  vi.mocked(getAccessToken).mockRejectedValueOnce(new SignedOutError("Signed out"));
  expect(await getSchedule("2026-09-21")).toMatchObject({ ok: false, code: "signed_out" });
  vi.mocked(getAccessToken).mockRejectedValueOnce(new NotAuthorizedError("Session expired"));
  expect(await getSchedule("2026-09-21")).toMatchObject({ ok: false, code: "unauthenticated" });
  expect(fetchMock).not.toHaveBeenCalled();
});
it("refreshes the token once on a 401, then retries once", async () => {
  vi.mocked(getAccessToken).mockResolvedValueOnce("old").mockResolvedValueOnce("new");
  fetchMock
    .mockResolvedValueOnce(Response.json({ error: { code: "unauthorized" } }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ days: [] }));
  expect(await getSchedule("2026-09-21")).toMatchObject({ ok: true });
  expect(getAccessToken).toHaveBeenLastCalledWith({ force: true });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock.mock.calls[1][1].headers.authorization).toBe("Bearer new");
});
it("returns a second 401 and does not loop", async () => {
  fetchMock.mockImplementation(async () => Response.json({ error: { code: "unauthorized" } }, { status: 401 }));
  expect(await getSchedule("2026-09-21")).toMatchObject({ ok: false, code: "unauthorized" });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(getAccessToken).toHaveBeenCalledTimes(2);
});
it("maps a refresh that a sign-out cancelled to signed_out", async () => {
  vi.mocked(getAccessToken)
    .mockResolvedValueOnce("old")
    .mockRejectedValueOnce(new SignedOutError("Signed out during refresh"));
  fetchMock.mockResolvedValue(Response.json({ error: { code: "unauthorized" } }, { status: 401 }));
  expect(await getSchedule("2026-09-21")).toMatchObject({ ok: false, code: "signed_out" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("sends minDuration with the free-slot read", async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ days: [] }));
  expect(await getFreeSlots("2026-09-21", "2026-09-22", 90)).toMatchObject({ ok: true });
  expect(Object.fromEntries(new URL(fetchMock.mock.calls[0][0]).searchParams)).toEqual({
    from: "2026-09-21",
    to: "2026-09-22",
    minDuration: "90",
  });
});
it("keeps the nearest slots of a rejected conflict row and drops a malformed one", async () => {
  const nearestSlots = [{ start: "2026-09-21T11:00", end: "2026-09-21T12:00", reason: "Next free hour" }];
  const error = { code: "conflict", message: "That time is taken.", nearestSlots: [...nearestSlots, { start: 9 }] };
  fetchMock.mockResolvedValueOnce(
    Response.json({ error, results: [{ index: 0, status: "error", error }] }, { status: 409 }),
  );
  const op = { op: "create" as const, start: "2026-09-21T10:00", end: "2026-09-21T11:00", name: "x" };
  expect(await writeEvents([op])).toEqual({
    ok: false,
    code: "conflict",
    message: "That time is taken.",
    status: 409,
    nearestSlots,
  });
});
it("reads the nearest slots from a top-level conflict error with no results", async () => {
  const nearestSlots = [{ start: "2026-09-21T11:00", end: "2026-09-21T12:00" }];
  fetchMock.mockResolvedValueOnce(
    Response.json({ error: { code: "conflict", message: "Taken.", nearestSlots } }, { status: 409 }),
  );
  const op = { op: "create" as const, start: "2026-09-21T10:00", end: "2026-09-21T11:00", name: "x" };
  expect(await writeEvents([op])).toMatchObject({ ok: false, code: "conflict", nearestSlots });
});
it("retries a 503 once for a body with a submissionId, with the same id", async () => {
  fetchMock.mockResolvedValueOnce(busy()).mockResolvedValueOnce(new Response(null, { status: 204 }));
  expect(await withFakeBackoff(() => sendFeedback("Nice", "idea"))).toEqual({ ok: true, data: undefined });
  const ids = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body).submissionId);
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
});
// The server replays a keyed booking, so the 503 retry cannot book the block twice.
it("retries a 503 once for a slot booking, with the same requestId", async () => {
  const receipt = { results: [{ index: 0, status: "ok", result: { event: { id: "ev1" } } }], undoToken: "u1" };
  fetchMock.mockResolvedValueOnce(busy()).mockResolvedValueOnce(Response.json(receipt));
  const booking = { name: "Read", start: "2026-09-21T09:00", durationMinutes: 60, requestId: "req-1" };
  expect(await withFakeBackoff(() => bookSlot(booking))).toEqual({ ok: true, data: receipt });
  expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([
    expect.stringMatching(/\/schedule\/plan$/),
    expect.stringMatching(/\/schedule\/plan$/),
  ]);
  const bodies = fetchMock.mock.calls.map((c) => JSON.parse(c[1].body));
  expect(bodies[0]).toEqual({ requests: [booking] });
  expect(bodies[1]).toEqual(bodies[0]);
});
it("does not show a non-JSON error page as the message", async () => {
  const page = "<!DOCTYPE html><html><body>FUNCTION_INVOCATION_TIMEOUT</body></html>";
  fetchMock.mockResolvedValue(new Response(page, { status: 504, headers: { "content-type": "text/html" } }));
  expect(await getSchedule("2026-09-21")).toEqual({
    ok: false,
    code: "internal",
    message: "Request failed (504).",
    status: 504,
  });
});
it("gives a code-less 403 a clear message", async () => {
  fetchMock.mockResolvedValue(new Response("Forbidden", { status: 403 }));
  expect(await getSchedule("2026-09-21")).toMatchObject({
    ok: false,
    message: "Reassign blocked the request (403). Try again later.",
    status: 403,
  });
});
it.each([
  ["an empty body", () => new Response(null, { status: 200 })],
  ["an HTML page", () => new Response("<html>Sign in to Wi-Fi</html>", { status: 200 })],
])("reports a 2xx with %s as a failure, not as data", async (_label, reply) => {
  fetchMock.mockImplementation(async () => reply());
  expect(await writeEvents([{ op: "delete", id: "id" }])).toMatchObject({ ok: false, code: "internal", status: 200 });
});
it("aborts a stalled request, and warns that a write can have landed", async () => {
  const controller = new AbortController();
  const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
  fetchMock.mockImplementation(
    (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        // Like fetch: reject at once for a signal that is already aborted.
        if (init.signal?.aborted) reject(init.signal.reason);
        init.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      }),
  );
  const read = getSchedule("2026-09-21");
  const write = writeEvents([{ op: "delete", id: "id" }]);
  controller.abort(new DOMException("The operation timed out.", "TimeoutError"));
  expect(await read).toEqual({ ok: false, code: "network", message: "Reassign did not answer in time. Try again." });
  expect(await write).toEqual({
    ok: false,
    code: "network",
    message: "Reassign did not answer in time. The change can have been saved. Check it before you try again.",
  });
  expect(timeout).toHaveBeenCalledWith(65_000);
  // A timed-out write is never sent again.
  expect(fetchMock).toHaveBeenCalledTimes(2);
  timeout.mockRestore();
});

// The timeout also covers the body read. A write that times out there has landed.
it("reports a body-read timeout on a POST as a possible save", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.error(Object.assign(new Error("The operation timed out."), { name: "TimeoutError" }));
    },
  });
  fetchMock.mockResolvedValue(new Response(body, { status: 200 }));
  expect(await writeEvents([{ op: "delete", id: "e1" }])).toEqual({
    ok: false,
    code: "network",
    message: "Reassign did not answer in time. The change can have been saved. Check it before you try again.",
  });
});

// 2xx headers arrived, so the write landed even if the body stream then drops with a
// non-timeout transport error (a socket close, a TLS truncation). Surface the warning so a
// manual retry of a non-idempotent create/shift does not silently double the write.
it("reports a non-timeout body-read failure on a POST as a possible save", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.error(new Error("The socket connection was closed."));
    },
  });
  fetchMock.mockResolvedValue(new Response(body, { status: 200 }));
  expect(await writeEvents([{ op: "create", start: "2026-09-21T09:00", end: "2026-09-21T10:00", name: "x" }])).toEqual({
    ok: false,
    code: "network",
    message: "The socket connection was closed. The change can have been saved. Check it before you try again.",
  });
});

// A read has no write to land, so a non-timeout body-read failure stays the raw error.
it("does not warn about a save on a non-timeout body-read failure on a GET", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.error(new Error("The socket connection was closed."));
    },
  });
  fetchMock.mockResolvedValue(new Response(body, { status: 200 }));
  expect(await getSchedule("2026-09-21")).toEqual({
    ok: false,
    code: "network",
    message: "The socket connection was closed.",
  });
});

// An initial fetch that throws has not delivered response headers, so a plain write is
// treated as not landed unless it timed out (where the request can already be in flight).
it("does not warn about a save on a non-timeout initial-fetch throw on a POST", async () => {
  fetchMock.mockRejectedValueOnce(new Error("The socket connection was closed."));
  expect(await writeEvents([{ op: "create", start: "2026-09-21T09:00", end: "2026-09-21T10:00", name: "x" }])).toEqual({
    ok: false,
    code: "network",
    message: "The socket connection was closed.",
  });
});

const timeoutError = () => Object.assign(new Error("The operation timed out."), { name: "TimeoutError" });
const failedBody = (error: Error) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.error(error);
      },
    }),
    { status: 200 },
  );
const failures: [string, () => void, string][] = [
  ["a fetch timeout", () => fetchMock.mockRejectedValue(timeoutError()), "Reassign did not answer in time."],
  [
    "a body-read timeout",
    () => fetchMock.mockImplementation(async () => failedBody(timeoutError())),
    "Reassign did not answer in time.",
  ],
  [
    "a body-read socket close",
    () => fetchMock.mockImplementation(async () => failedBody(new Error("The socket connection was closed."))),
    "The socket connection was closed.",
  ],
];
// A preview changes nothing on the server, so "can have been saved" is false there.
it.each(failures)("does not warn about a save on %s for a preview", async (_label, fail, base) => {
  fail();
  const message = base.endsWith("in time.") ? `${base} Try again.` : base;
  expect(await previewBlock("deep work tomorrow 9am")).toEqual({ ok: false, code: "network", message });
  // No new retry: one fetch for the call.
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
