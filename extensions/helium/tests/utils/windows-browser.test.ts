import { EventEmitter } from "events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { spawn } from "child_process";
import { new_tab, switch_tab } from "../mocks/rust";
import { getUserDataPathPreference, getWindowsUserDataPath } from "../../src/utils/platform";
import { createNewTab, createNewWindow, openUrlInHelium, switchToTabByTitle } from "../../src/utils/windows-browser";

vi.mock("child_process", () => ({ spawn: vi.fn() }));
vi.mock("fs", () => ({ existsSync: vi.fn(() => true) }));
vi.mock("../../src/utils/platform", () => ({
  requireHeliumExecutable: () => "C:\\Helium\\chrome.exe",
  getUserDataPathPreference: vi.fn(),
  getWindowsUserDataPath: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getWindowsUserDataPath).mockReturnValue("C:\\Helium\\User Data");
  vi.mocked(spawn).mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { unref: vi.fn() });
    queueMicrotask(() => child.emit("spawn"));
    return child as unknown as ReturnType<typeof spawn>;
  });
});

describe("native Windows browser control", () => {
  it("switches through Rust and surfaces failures without launching a duplicate URL", async () => {
    await expect(switchToTabByTitle("Page")).resolves.toBe(true);
    expect(switch_tab).toHaveBeenCalledWith("C:\\Helium\\chrome.exe", "Page");
    switch_tab.mockRejectedValueOnce(new Error("Tab not found"));
    await expect(switchToTabByTitle("Old title")).rejects.toThrow("Tab not found");
    expect(spawn).not.toHaveBeenCalled();
  });

  it("uses guarded native new-tab input for a default instance", async () => {
    new_tab.mockResolvedValue(true);
    await createNewTab();
    expect(new_tab).toHaveBeenCalledWith("C:\\Helium\\chrome.exe");
    expect(spawn).not.toHaveBeenCalled();
  });

  it("launches the selected profile when no browser window exists", async () => {
    new_tab.mockResolvedValue(false);
    await createNewTab();
    expect(spawn).toHaveBeenCalledWith(
      "C:\\Helium\\chrome.exe",
      ["--user-data-dir=C:\\Helium\\User Data", "chrome://new-tab-page/"],
      expect.anything(),
    );
  });

  it("bypasses executable-only keyboard input for a custom User Data directory", async () => {
    vi.mocked(getUserDataPathPreference).mockReturnValue("D:\\Portable\\User Data");
    vi.mocked(getWindowsUserDataPath).mockReturnValue("D:\\Portable\\User Data");
    await createNewTab();
    expect(new_tab).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(
      expect.anything(),
      ["--user-data-dir=D:\\Portable\\User Data", "chrome://new-tab-page/"],
      expect.anything(),
    );
  });

  it("does not launch after a native focus or input failure", async () => {
    new_tab.mockRejectedValue(new Error("Helium lost focus"));
    await expect(createNewTab()).rejects.toThrow("Helium lost focus");
    expect(spawn).not.toHaveBeenCalled();
  });

  it("pins URL and window launches to the same User Data directory", async () => {
    await openUrlInHelium("https://example.com");
    await createNewWindow();
    expect(vi.mocked(spawn).mock.calls.map((call) => call[1])).toEqual([
      ["--user-data-dir=C:\\Helium\\User Data", "https://example.com"],
      ["--user-data-dir=C:\\Helium\\User Data", "--new-window", "chrome://new-tab-page/"],
    ]);
  });

  it("surfaces asynchronous process launch failures", async () => {
    vi.mocked(spawn).mockImplementationOnce(() => {
      const child = new EventEmitter();
      queueMicrotask(() => child.emit("error", new Error("Access denied")));
      return child as ReturnType<typeof spawn>;
    });
    await expect(openUrlInHelium("https://example.com")).rejects.toThrow("Access denied");
  });
});
