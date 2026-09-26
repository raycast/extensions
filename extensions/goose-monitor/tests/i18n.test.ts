import { describe, expect, test } from "bun:test";
import { formatHelperRole, formatKillError, formatProtectedReason, formatTransferError, t, zh } from "../src/lib/i18n";
import { fmtPctInt } from "../src/lib/format";

describe("copy", () => {
  test("English is the default; Chinese is optional", () => {
    expect(t.quit).toBe("Quit");
    expect(t.settingsAndTransfer).toBe("Settings & Data Transfer");
    expect(t.otherProcesses(3)).toBe("3 other processes");
    expect(t.memPressureTooltip(fmtPctInt(0.72), fmtPctInt(0.34))).toBe("Memory 72% · Pressure 34%");
    expect(zh.quit).toBe("结束");
    expect(zh.forceQuit).toBe("强制结束");
    expect(zh.wiredMemory).toBe("联动内存");
    expect(zh.pageRead("219 KB/s")).toBe("读 219 KB/s");
    expect(zh.otherProcesses(3)).toBe("其余 3 个进程");
    expect(formatTransferError(new Error("共享文件已被外部修改，已阻止覆盖；请先重新读取"))).toContain("overwrite blocked");
    expect(formatTransferError(new Error("共享文件已被外部修改，已阻止覆盖；请先重新读取"), zh)).toContain("已阻止覆盖");
  });
});

describe("formatProtectedReason / formatHelperRole / formatKillError", () => {
  test("保护原因与角色译成中文，未知原文保留", () => {
    expect(formatProtectedReason("system process", zh)).toBe("系统进程");
    expect(formatProtectedReason("another user", zh)).toBe("其他用户");
    expect(formatProtectedReason("PID 0–1", zh)).toBe("PID 0–1");
    expect(formatHelperRole("Main Process", zh)).toBe("主进程");
    expect(formatHelperRole("Renderer", zh)).toBe("渲染进程");
    expect(formatHelperRole("Custom Role")).toBe("Custom Role");
  });

  test("kill 错误译成中文，PID 权限原文保留", () => {
    expect(formatKillError("Process did not exit. Try Force Quit.", zh)).toBe("进程未退出，请尝试强制结束。");
    expect(formatKillError("Protected process: critical system process or permission denied", zh)).toContain("受保护");
    expect(formatKillError("PID 12: Operation not permitted")).toBe("PID 12: Operation not permitted");
  });
});
