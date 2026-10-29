import { beforeEach, describe, expect, it, vi } from "vitest";

const { execFileSync, execSync } = vi.hoisted(() => ({
  execFileSync: vi.fn(),
  execSync: vi.fn(),
}));

vi.mock("node:child_process", () => ({ execFileSync, execSync }));

import { getOpenWindowIds } from "./window-state";

describe("getOpenWindowIds", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execSync.mockReturnValue(undefined);
  });

  it("parses the session and window IDs returned by Gram", () => {
    execFileSync.mockReturnValue("session_id|session-123\nsession_window_stack|[3,7,3]\n");

    expect(getOpenWindowIds("/test/gram.sqlite")).toEqual({
      sessionId: "session-123",
      windowIds: new Set([3, 7]),
    });
    expect(execSync).toHaveBeenCalledWith('pgrep -f "Gram.app"', { stdio: "ignore" });
    expect(execFileSync).toHaveBeenCalledWith(
      "sqlite3",
      [
        "-cmd",
        ".timeout 5000",
        "/test/gram.sqlite",
        "SELECT key, value FROM kv_store WHERE key IN ('session_id', 'session_window_stack')",
      ],
      { encoding: "utf8" },
    );
  });

  it("returns no IDs when Gram is not running", () => {
    execSync.mockImplementation(() => {
      throw new Error("process not found");
    });

    expect(getOpenWindowIds("/test/gram.sqlite")).toEqual({
      sessionId: null,
      windowIds: new Set(),
    });
    expect(execFileSync).not.toHaveBeenCalled();
  });

  it("returns no IDs when the database query fails", () => {
    execFileSync.mockImplementation(() => {
      throw new Error("database unavailable");
    });

    expect(getOpenWindowIds("/test/gram.sqlite")).toEqual({
      sessionId: null,
      windowIds: new Set(),
    });
  });
});
