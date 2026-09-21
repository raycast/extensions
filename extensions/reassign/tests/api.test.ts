import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../src/lib/oauth", () => ({
  getAccessToken: vi.fn(async () => "token"),
  NotAuthorizedError: class extends Error {},
  SignedOutError: class extends Error {},
}));
import { getScheduleWithBacklog, sendFeedback, updateEvent } from "../src/lib/api";
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
    date: "2026-09-21",
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
  fetchMock.mockResolvedValue(Response.json({ ok: true }));
  await sendFeedback("The menu bar is helpful", "idea");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ kind: "idea", message: "The menu bar is helpful" });
});
it("preserves the backend's rejected-batch error", async () => {
  fetchMock.mockResolvedValue(
    Response.json({ rejected: true, results: [{ errorCode: "conflict", error: "Time occupied" }] }, { status: 409 }),
  );
  expect(await updateEvent("id", { end: "11:00" })).toMatchObject({
    ok: false,
    code: "conflict",
    message: "Time occupied",
  });
});
it("always asks AI for a preview without applying changes", async () => {
  const { previewBlock } = await import("../src/lib/api");
  fetchMock.mockResolvedValue(Response.json({ applied: false, intents: [] }));
  await previewBlock("deep work tomorrow morning");
  expect(fetchMock.mock.calls[0][0]).toBe("https://reassign.app/api/v1/command");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    input: "deep work tomorrow morning",
    mode: "line",
    apply: false,
  });
});
