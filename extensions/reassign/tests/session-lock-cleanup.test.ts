import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ open: vi.fn(), close: vi.fn(), mkdir: vi.fn(), delay: vi.fn(), now: 0 }));
vi.mock("@raycast/api", () => ({ environment: { supportPath: "/unused/reassign" } }));
vi.mock("node:fs/promises", () => ({ open: mock.open, mkdir: mock.mkdir }));
vi.mock("node:timers/promises", () => ({ setTimeout: mock.delay }));

const platform = process.platform;
beforeEach(() => {
  vi.resetModules();
  Object.defineProperty(process, "platform", { value: "darwin" });
  mock.now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => mock.now);
  mock.open.mockReset().mockResolvedValue({ close: mock.close });
  mock.close.mockReset().mockResolvedValue(undefined);
  mock.mkdir.mockReset().mockResolvedValue(undefined);
  mock.delay.mockReset().mockImplementation(async (ms: number) => {
    mock.now += ms;
  });
});
afterEach(() => {
  Object.defineProperty(process, "platform", { value: platform });
  vi.restoreAllMocks();
});

it("times out a waiter without running its action or releasing another owner's lock", async () => {
  mock.open.mockRejectedValue(Object.assign(new Error("busy"), { code: "EAGAIN" }));
  const { withSessionLock, SessionLockTimeoutError } = await import("../src/lib/session-lock");
  const action = vi.fn();
  await expect(withSessionLock(action)).rejects.toBeInstanceOf(SessionLockTimeoutError);
  expect(mock.now).toBe(30_000);
  expect(action).not.toHaveBeenCalled();
  expect(mock.close).not.toHaveBeenCalled();
});

it.each(["EACCES", "EIO", "ELOOP", "ENOTSUP"])("fails closed on %s rather than running unlocked", async (code) => {
  const error = Object.assign(new Error("open failed"), { code });
  mock.open.mockRejectedValue(error);
  const { withSessionLock } = await import("../src/lib/session-lock");
  const action = vi.fn();
  await expect(withSessionLock(action)).rejects.toBe(error);
  expect(action).not.toHaveBeenCalled();
  expect(mock.delay).not.toHaveBeenCalled();
});

it("reports a release failure instead of silently claiming success", async () => {
  const error = new Error("close failed");
  mock.close.mockRejectedValue(error);
  const { withSessionLock } = await import("../src/lib/session-lock");
  await expect(withSessionLock(async () => "ok")).rejects.toBe(error);
});

it("never uses Darwin flag values on an unsupported platform", async () => {
  Object.defineProperty(process, "platform", { value: "linux" });
  const { withSessionLock } = await import("../src/lib/session-lock");
  const action = vi.fn();
  await expect(withSessionLock(action)).rejects.toThrow("requires macOS");
  expect(mock.open).not.toHaveBeenCalled();
  expect(action).not.toHaveBeenCalled();
});
