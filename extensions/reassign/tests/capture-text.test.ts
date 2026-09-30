import { expect, it } from "vitest";
import { captureText, captureTextOp, capturedNames, captureToast } from "../src/lib/capture-text";
import type { BatchReceipt } from "../src/lib/envelope";

const receipt = (created: unknown): BatchReceipt => ({
  undoToken: "undo",
  results: [{ index: 0, status: "ok", result: { created, source: "ai" } }],
});

it("keeps every line of the text, trimmed, without blank lines", () => {
  expect(captureText("  Buy milk \r\n\n   \nCall mom  \n")).toBe("Buy milk\nCall mom");
  expect(captureText(" \n ")).toBe("");
});

it("clamps the text to the server limit", () => {
  expect(captureText("x".repeat(2500))).toHaveLength(2000);
});

it("builds the op with only the fields that have a value", () => {
  expect(captureTextOp("Buy milk")).toEqual({ op: "capture_text", text: "Buy milk" });
  expect(
    captureTextOp("Buy milk", {
      durationMinutes: 45,
      plannedDate: undefined,
      notes: "",
      areaId: "a1",
      activityTypeId: undefined,
      kind: "reference",
    }),
  ).toEqual({ op: "capture_text", text: "Buy milk", durationMinutes: 45, areaId: "a1", kind: "reference" });
});

it("reads the created names in text order", () => {
  expect(
    capturedNames(
      receipt([
        { id: "1", name: "Buy milk" },
        { id: "2", name: "Call mom" },
      ]),
    ),
  ).toEqual(["Buy milk", "Call mom"]);
  // The old `capture` op returns one object, not an array.
  expect(capturedNames(receipt({ id: "1", name: "Buy milk" }))).toEqual([]);
  expect(capturedNames(undefined)).toEqual([]);
  expect(capturedNames(receipt([{ id: "1" }, null, { name: "Call mom" }]))).toEqual(["Call mom"]);
});

it("shows the count in the title and the names in the message", () => {
  expect(captureToast(receipt([{ name: "Buy milk" }, { name: "Call mom" }]))).toEqual({
    title: "Added 2 to Inbox",
    message: "Buy milk · Call mom",
  });
  expect(captureToast(receipt([{ name: "Buy milk" }]))).toEqual({ title: "Saved “Buy milk” to Inbox" });
  expect(captureToast(receipt([]))).toEqual({ title: "Saved to Inbox" });
});
