import { describe, expect, it, vi } from "vitest";
import { showToast } from "@raycast/api";
import { handleKill } from "../src/utilities/handleKill";
import { platformShortcut } from "../src/utilities/platform";

describe("kill feedback", () => {
  it("shows success and reloads after the kill completes", async () => {
    const kill = vi.fn().mockResolvedValue(undefined);
    const reload = vi.fn().mockResolvedValue(undefined);
    await handleKill({ pid: 42, name: "node" }, kill, reload);
    expect(showToast).toHaveBeenCalledWith({ style: "success", title: "Killed Process", message: "node (42)" });
    expect(kill.mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(showToast).mock.invocationCallOrder[0]);
    expect(vi.mocked(showToast).mock.invocationCallOrder[0]).toBeLessThan(reload.mock.invocationCallOrder[0]);
  });
  it("shows errors and skips reload when the kill fails", async () => {
    const reload = vi.fn();
    await handleKill(
      { pid: 42 },
      async () => {
        throw new Error("permission denied");
      },
      reload,
    );
    expect(showToast).toHaveBeenCalledWith({ style: "failure", title: "permission denied" });
    expect(reload).not.toHaveBeenCalled();
  });
  it("allows success without a reload callback", async () => {
    await handleKill({ pid: 42, name: "node" }, async () => {});
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ style: "success" }));
  });
});

describe("platform shortcuts", () => {
  it.each(["darwin", "win32"] as const)("selects the shortcut for %s", async (platform) => {
    vi.spyOn(process, "platform", "get").mockReturnValue(platform);
    vi.resetModules();
    const { platformShortcut: shortcut } = await import("../src/utilities/platform");
    const mac = { modifiers: ["cmd"], key: "k" } as Parameters<typeof platformShortcut>[0];
    const windows = { modifiers: ["ctrl"], key: "k" } as Parameters<typeof platformShortcut>[1];
    expect(shortcut(mac, windows)).toBe(platform === "win32" ? windows : mac);
  });
});
