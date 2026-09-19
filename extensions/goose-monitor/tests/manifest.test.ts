import { describe, expect, test } from "bun:test";
import manifest from "../package.json";

/**
 * 平台限制：官方 manifest 没有「保持启用但从 Root Search 隐藏」的字段，
 * 所以两个菜单栏命令必须留在 commands 里，用默认开启的设置开关只控制菜单栏图标。
 */
describe("package.json 菜单栏开关", () => {
  test("两个开关是默认开启的 checkbox", () => {
    for (const name of ["showCpuMenuBar", "showMemoryMenuBar"]) {
      const pref = manifest.preferences.find((item) => item.name === name);
      expect(pref).toMatchObject({ type: "checkbox", required: false, default: true });
    }
  });

  test("CPU 面板入口已删，两个 menu-bar 命令保留且不设 disabledByDefault", () => {
    expect(manifest.commands.map((command) => command.name)).toEqual([
      "manage-processes",
      "menu-bar-cpu",
      "menu-bar-mem",
    ]);
    expect(manifest.commands.filter((command) => command.mode === "menu-bar")).toHaveLength(2);
    for (const command of manifest.commands) expect(command).not.toHaveProperty("disabledByDefault");
  });
});
