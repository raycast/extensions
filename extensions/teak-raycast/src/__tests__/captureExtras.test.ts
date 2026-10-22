import { expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";

mock.module("@raycast/api", () => ({
  ...createRaycastApiMock(false),
  Toast: { Style: { Failure: "failure" } },
  open: () => Promise.resolve(),
  showToast: () => Promise.resolve({}),
}));
const { parseCaptureExtras } = await import("../lib/capture");

test("sends tags and a note only when they have content", () => {
  expect(
    parseCaptureExtras({
      notes: "  from a call ",
      tags: "design, ideas ,design",
    }),
  ).toEqual({ notes: "from a call", tags: ["design", "ideas"] });
  expect(parseCaptureExtras({ notes: "   ", tags: " , " })).toEqual({});
  expect(parseCaptureExtras({})).toEqual({});
});
