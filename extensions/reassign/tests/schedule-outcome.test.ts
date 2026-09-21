import { expect, it } from "vitest";
import { readOutcome } from "../src/lib/schedule-outcome";
it("reads a committed event and undo token from the nested API receipt", () => {
  expect(
    readOutcome({
      committed: 1,
      failed: 0,
      results: [{ index: 0, status: "ok", result: { status: "committed", event: { id: "event" }, undoToken: "undo" } }],
    }),
  ).toEqual({ kind: "committed", eventId: "event", undoToken: "undo" });
});
it("reads the documented confirm receipt's event id", () => {
  expect(
    readOutcome({ committed: 1, results: [{ status: "ok", result: { id: "event", undoToken: "undo" } }] }),
  ).toMatchObject({ kind: "committed", eventId: "event", undoToken: "undo" });
});
it("reads proposals and the expiry from the nested API receipt", () => {
  const options = [{ choice: 0, date: "2026-09-22", start: "09:00", end: "11:00" }];
  expect(
    readOutcome({
      committed: 0,
      results: [
        { status: "ok", result: { status: "proposals", commitToken: "proposal", options, expiresAt: 1790000000000 } },
      ],
    }),
  ).toEqual({ kind: "proposals", commitToken: "proposal", options, expiresAt: 1790000000000 });
});
it.each([
  {},
  { committed: 0, failed: 1, results: [{ status: "error", error: "No slot" }] },
  { committed: 1, results: [{ status: "error" }] },
  { results: [{ status: "ok", result: { status: "proposals", options: [] } }] },
])("does not report a malformed or failed response as saved: %j", (data) => {
  expect(readOutcome(data)).toEqual({ kind: "failed" });
});
