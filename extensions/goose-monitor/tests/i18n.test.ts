import { describe, expect, test } from "bun:test";
import { formatHelperRole, formatKillError, formatProtectedReason, t } from "../src/lib/i18n";
import { fmtPctInt } from "../src/lib/format";

describe("文案", () => {
  test("界面为简体中文", () => {
    expect(t.quit).toBe("结束");
    expect(t.forceQuit).toBe("强制结束");
    expect(t.wiredMemory).toBe("联动内存");
    expect(t.pressure).toBe("压力");
    expect(t.memUsage).toBe("内存使用");
    expect(t.paging).toBe("分页");
    expect(t.pageRead("219 KB/s")).toBe("读 219 KB/s");
    expect(t.pageWrite("0 B/s")).toBe("写 0 B/s");
    expect(t.otherProcesses(3)).toBe("其余 3 个进程");
    expect(t.cpuValue(fmtPctInt(0.262))).toBe("CPU 26%");
    expect(t.memPressureTooltip(fmtPctInt(0.72), fmtPctInt(0.34))).toBe("内存 72% · 压力 34%");
  });
});

describe("formatProtectedReason / formatHelperRole / formatKillError", () => {
  test("保护原因与角色译成中文，未知原文保留", () => {
    expect(formatProtectedReason("system process")).toBe("系统进程");
    expect(formatProtectedReason("another user")).toBe("其他用户");
    expect(formatProtectedReason("PID 0–1")).toBe("PID 0–1");
    expect(formatHelperRole("Main Process")).toBe("主进程");
    expect(formatHelperRole("Renderer")).toBe("渲染进程");
    expect(formatHelperRole("Custom Role")).toBe("Custom Role");
  });

  test("kill 错误译成中文，PID 权限原文保留", () => {
    expect(formatKillError("Process did not exit. Try Force Quit.")).toBe("进程未退出，请尝试强制结束。");
    expect(formatKillError("Protected process: critical system process or permission denied")).toContain("受保护");
    expect(formatKillError("PID 12: Operation not permitted")).toBe("PID 12: Operation not permitted");
  });
});
