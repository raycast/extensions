import { describe, expect, test } from "bun:test";
import { formatHelperRole, formatKillError, formatProtectedReason, formatTransferError, t } from "../src/lib/i18n";
import { fmtPctInt } from "../src/lib/format";

describe("copy", () => {
  test("UI copy is English", () => {
    expect(t.quit).toBe("Quit");
    expect(t.settingsAndTransfer).toBe("Settings & Data Transfer");
    expect(t.otherProcesses(3)).toBe("3 other processes");
    expect(t.memPressureTooltip(fmtPctInt(0.72), fmtPctInt(0.34))).toBe("Memory 72% · Pressure 34%");
    expect(formatTransferError(new Error("Shared file changed elsewhere; overwrite blocked. Reload it first"))).toContain(
      "overwrite blocked",
    );
  });
});

describe("formatProtectedReason / formatHelperRole / formatKillError", () => {
  test("known reasons and roles map to UI copy; unknown text is kept", () => {
    expect(formatProtectedReason("system process")).toBe("System process");
    expect(formatProtectedReason("another user")).toBe("Another user");
    expect(formatProtectedReason("PID 0–1")).toBe("PID 0–1");
    expect(formatHelperRole("Main Process")).toBe("Main Process");
    expect(formatHelperRole("Custom Role")).toBe("Custom Role");
  });

  test("kill errors map to UI copy; PID permission errors are kept verbatim", () => {
    expect(formatKillError("Process did not exit. Try Force Quit.")).toBe("Process did not exit. Try Force Quit.");
    expect(formatKillError("Protected process: critical system process or permission denied")).toContain("Protected");
    expect(formatKillError("PID 12: Operation not permitted")).toBe("PID 12: Operation not permitted");
  });
});
