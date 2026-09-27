import { expect, it } from "vitest";
import { readOutcome } from "../src/lib/schedule-outcome";
it("reads a committed event and the batch undo token", () => {
  expect(
    readOutcome({
      undoToken: "undo",
      results: [{ index: 0, status: "ok", result: { event: { id: "event" } } }],
    }),
  ).toEqual({ kind: "committed", eventId: "event", undoToken: "undo" });
});
it("reads a confirm row the same way", () => {
  expect(
    readOutcome({ undoToken: "undo", results: [{ index: 0, status: "ok", result: { event: { id: "event" } } }] }),
  ).toEqual({ kind: "committed", eventId: "event", undoToken: "undo" });
});
it("reads proposals and the ISO expiry from the nested API receipt", () => {
  const options = [{ date: "2026-09-22", start: "09:00", end: "11:00", score: 0.9, reason: "Free morning" }];
  expect(
    readOutcome({
      results: [
        {
          index: 0,
          status: "ok",
          result: { commitToken: "proposal", options, expiresAt: "2026-09-22T08:00:00.000Z" },
        },
      ],
    }),
  ).toEqual({ kind: "proposals", commitToken: "proposal", options, expiresAt: Date.parse("2026-09-22T08:00:00.000Z") });
});
it.each([
  {},
  { results: [{ index: 0, status: "skipped", reason: "atomic" }] },
  { results: [{ index: 0, status: "ok", result: { commitToken: "proposal", options: [] } }] },
  { results: [{ index: 0, status: "ok", result: { event: {} } }] },
])("does not report a malformed or failed response as saved: %j", (data) => {
  expect(readOutcome(data)).toEqual({ kind: "failed" });
});
it("carries the server reason of a rejected row", () => {
  expect(
    readOutcome({ results: [{ index: 0, status: "error", error: { code: "validation", message: "Bad window" } }] }),
  ).toEqual({ kind: "failed", error: { ok: false, code: "validation", message: "Bad window" } });
});
