import { beforeEach, describe, expect, it, vi } from "vitest";

const native = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@raycast/api", () => ({
  environment: { assetsPath: "/fixture/assets", supportPath: "/fixture/support" },
}));
vi.mock("node:util", () => ({ promisify: () => native.run }));
vi.mock("node:fs/promises", () => ({
  access: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue("fixture native source"),
  chmod: vi.fn(),
  mkdir: vi.fn(),
  rename: vi.fn(),
  rm: vi.fn(),
}));

const enabledStatus = {
  stdout: JSON.stringify({
    ok: true,
    defaultEnabled: true,
    originalDefaultEnabled: true,
    changed: false,
    version: "2026.5",
    method: "native-accessibility",
    disableConfirmationHandled: false,
    warnings: [],
  }),
};

beforeEach(() => {
  vi.resetModules();
  native.run.mockReset();
});

describe("packaged control request concurrency", () => {
  it("shares overlapping status reads and performs a fresh read after completion", async () => {
    let finish!: (value: typeof enabledStatus) => void;
    native.run.mockImplementationOnce(
      () => new Promise((resolve) => (finish = resolve)),
    );
    const { control } = await import("../src/lib/control");
    const first = control("status");
    const overlapping = control("status");
    await vi.waitFor(() => expect(native.run).toHaveBeenCalledTimes(1));
    finish(enabledStatus);
    expect((await first).defaultEnabled).toBe(true);
    expect((await overlapping).defaultEnabled).toBe(true);
    native.run.mockResolvedValueOnce(enabledStatus);
    await control("status");
    expect(native.run).toHaveBeenCalledTimes(2);
  });

  it("does not merge two mutation requests", async () => {
    native.run.mockResolvedValue(enabledStatus);
    const { control } = await import("../src/lib/control");
    await Promise.all([
      control("enable-default"),
      control("enable-default"),
    ]);
    expect(native.run).toHaveBeenCalledTimes(2);
    expect(native.run.mock.calls.every((call) => call[1][0] === "enable-default")).toBe(true);
  });

  it("clears a rejected status read so a later retry can run", async () => {
    native.run.mockRejectedValueOnce(new Error("fixture process failure"));
    const { control } = await import("../src/lib/control");
    await expect(control("status")).rejects.toThrow("could not run");
    native.run.mockResolvedValueOnce(enabledStatus);
    expect((await control("status")).defaultEnabled).toBe(true);
    expect(native.run).toHaveBeenCalledTimes(2);
  });
});
