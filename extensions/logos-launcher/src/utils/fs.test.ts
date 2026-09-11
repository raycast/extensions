import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "os";
import path from "path";

// Mock fs/promises before importing the module
vi.mock("fs/promises", () => ({
  default: {
    access: vi.fn(),
  },
}));

import { expandTilde, pathExists } from "./fs";
import fs from "fs/promises";

describe("expandTilde", () => {
  it("expands ~ to home directory", () => {
    const homedir = os.homedir();
    expect(expandTilde("~/Documents")).toBe(path.join(homedir, "Documents"));
  });

  it("expands ~/nested/path correctly", () => {
    const homedir = os.homedir();
    expect(expandTilde("~/nested/path/file.txt")).toBe(path.join(homedir, "nested/path/file.txt"));
  });

  it("returns path unchanged if it does not start with ~", () => {
    expect(expandTilde("/absolute/path")).toBe("/absolute/path");
  });

  it("returns relative path unchanged", () => {
    expect(expandTilde("relative/path")).toBe("relative/path");
  });

  it("handles just ~ correctly", () => {
    const homedir = os.homedir();
    expect(expandTilde("~")).toBe(homedir);
  });

  it("does not expand ~ in the middle of path", () => {
    expect(expandTilde("/path/with~/tilde")).toBe("/path/with~/tilde");
  });
});

describe("pathExists", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("returns true when file exists", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const result = await pathExists("/some/existing/path");
    expect(result).toBe(true);
    expect(fs.access).toHaveBeenCalledWith("/some/existing/path");
  });

  it("returns false when file does not exist (ENOENT)", async () => {
    const enoentError = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    vi.mocked(fs.access).mockRejectedValue(enoentError);
    const result = await pathExists("/nonexistent/path");
    expect(result).toBe(false);
  });

  it("throws for other errors (e.g., EACCES)", async () => {
    const permissionError = Object.assign(new Error("Permission denied"), { code: "EACCES" });
    vi.mocked(fs.access).mockRejectedValue(permissionError);
    await expect(pathExists("/restricted/path")).rejects.toThrow("Permission denied");
  });
});
