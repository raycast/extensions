import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const shared = vi.hoisted(() => ({ path: "", lock: vi.fn() }));
vi.mock("@raycast/api", () => ({
  environment: {
    get supportPath() {
      return shared.path;
    },
  },
}));
vi.mock("proper-lockfile", () => ({ lock: shared.lock }));

beforeEach(async () => {
  vi.resetModules();
  shared.lock.mockReset();
  shared.path = await mkdtemp(join(tmpdir(), "reassign-lock-cleanup-"));
});
afterEach(async () => {
  await rm(shared.path, { recursive: true, force: true });
});

it.each(["EACCES", "ERELEASED"])("reports an unexpected %s release failure", async (code) => {
  const error = Object.assign(new Error("release failed"), { code });
  shared.lock.mockResolvedValue(async () => {
    throw error;
  });
  const { withSessionLock } = await import("../src/lib/session-lock");
  await expect(withSessionLock(async () => "ok")).rejects.toBe(error);
});

it("reports unrelated release failures even after compromise", async () => {
  const error = Object.assign(new Error("release failed"), { code: "EACCES" });
  let compromise!: (error: Error) => void;
  shared.lock.mockImplementation(async (_path, options) => {
    compromise = options.onCompromised;
    return async () => {
      throw error;
    };
  });
  const { withSessionLock } = await import("../src/lib/session-lock");
  await expect(
    withSessionLock(async () => {
      compromise(new Error("lost ownership"));
      return "obsolete";
    }),
  ).rejects.toBe(error);
});
