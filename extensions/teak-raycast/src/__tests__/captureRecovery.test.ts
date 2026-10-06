import { afterEach, expect, mock, test } from "bun:test";
import { createRaycastApiMock } from "./raycastApiMock";

const toasts: Array<{ title: string; message?: string }> = [];
mock.module("@raycast/api", () => ({
  ...createRaycastApiMock(false),
  Toast: { Style: { Failure: "failure" } },
  showToast: (options: (typeof toasts)[number]) => {
    toasts.push(options);
    return Promise.resolve({});
  },
  open: () => Promise.resolve(),
}));
const { ensureCredentialsForNoViewCommand } = await import("../lib/capture");
const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
test("no-view discovery outage shows a connection failure and stops", async () => {
  globalThis.fetch = (() =>
    Promise.reject(new Error("Offline"))) as typeof fetch;
  expect(await ensureCredentialsForNoViewCommand()).toBe(false);
  expect(toasts).toMatchObject([
    {
      title: "Unable to reach Teak",
      message: "Check your connection and try again.",
    },
  ]);
});
