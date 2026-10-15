import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { captureException } = vi.hoisted(() => ({ captureException: vi.fn() }));
vi.mock("@raycast/api", async (original) => ({ ...(await original<object>()), captureException }));

import { apiFetch } from "../../src/lib/api";

beforeEach(() => {
  vi.useFakeTimers();
  captureException.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const respondWith = (status: number) =>
  vi.stubGlobal("fetch", async () => ({
    ok: status < 400,
    status,
    statusText: "",
    headers: { get: () => null },
    text: async () => "",
  }));

const settle = async (request: Promise<unknown>) => {
  const caught = request.catch(() => undefined);
  await vi.runAllTimersAsync();
  await caught;
};

it.each([401, 403, 429, 500, 503])("does not report a %i", async (status) => {
  respondWith(status);
  await settle(apiFetch("/sites"));
  expect(captureException).not.toHaveBeenCalled();
});

it.each([400, 404, 405, 422])("reports a %i", async (status) => {
  respondWith(status);
  await settle(apiFetch("/sites"));
  expect(captureException).toHaveBeenCalledOnce();
});

it("does not report a dropped connection", async () => {
  vi.stubGlobal("fetch", async () => {
    throw new TypeError("fetch failed");
  });
  await settle(apiFetch("/sites"));
  expect(captureException).not.toHaveBeenCalled();
});

it("still throws what it no longer reports", async () => {
  respondWith(403);
  const assertion = expect(apiFetch("/sites")).rejects.toThrow(/^403/);
  await vi.runAllTimersAsync();
  await assertion;
});
