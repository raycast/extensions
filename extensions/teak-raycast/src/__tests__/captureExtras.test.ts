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

test("text that only starts with a URL links just that URL", async () => {
  const { extractFirstHttpUrl } = await import("../lib/capture");
  expect(extractFirstHttpUrl("https://example.com/a")).toBe(
    "https://example.com/a",
  );
  expect(
    extractFirstHttpUrl("https://github.com/teak/app is the repo\nwith notes"),
  ).toBe("https://github.com/teak/app");
});
