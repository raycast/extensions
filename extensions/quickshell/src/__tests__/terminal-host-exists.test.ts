import { afterEach, describe, expect, it, vi } from "vitest";

const execFileSync = vi.hoisted(() => vi.fn());
const existsSync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  execFileSync,
}));

vi.mock("node:fs", async () => {
  const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
  return {
    ...actual,
    existsSync,
  };
});

import { invalidateTerminalCatalogCache, terminalHostExecutableExists } from "../lib/terminal-catalog";

describe("terminalHostExecutableExists", () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, "platform", { configurable: true, value: originalPlatform });
    invalidateTerminalCatalogCache();
    execFileSync.mockReset();
    existsSync.mockReset();
  });

  it("returns true when where.exe finds App Execution Alias hosts", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    existsSync.mockReturnValue(false);
    execFileSync.mockReturnValue(Buffer.from(""));

    expect(terminalHostExecutableExists("wt.exe")).toBe(true);
    expect(terminalHostExecutableExists("wtai.exe")).toBe(true);
    expect(execFileSync).toHaveBeenCalledWith(
      "where.exe",
      ["wt.exe"],
      expect.objectContaining({ windowsHide: true, stdio: "ignore" }),
    );
    expect(execFileSync).toHaveBeenCalledWith(
      "where.exe",
      ["wtai.exe"],
      expect.objectContaining({ windowsHide: true, stdio: "ignore" }),
    );
  });

  it("returns false when existsSync and where.exe both miss", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    existsSync.mockReturnValue(false);
    execFileSync.mockImplementation(() => {
      throw new Error("not found");
    });

    expect(terminalHostExecutableExists("wt.exe")).toBe(false);
    expect(terminalHostExecutableExists("wtai.exe")).toBe(false);
  });

  it("prefers existsSync and skips where.exe when the file is present", () => {
    existsSync.mockReturnValue(true);

    expect(terminalHostExecutableExists("cmd.exe")).toBe(true);
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it("does not call where.exe for ordinary shells that miss existsSync", () => {
    Object.defineProperty(process, "platform", { configurable: true, value: "win32" });
    existsSync.mockReturnValue(false);

    expect(terminalHostExecutableExists("cmd.exe")).toBe(false);
    expect(execFileSync).not.toHaveBeenCalled();
  });
});
