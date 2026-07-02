import { describe, it, expect, vi, beforeEach } from "vitest";

const openMock = vi.fn();
const getApplicationsMock = vi.fn();
const runPowerShellMock = vi.fn();
const spawnMock = vi.fn<(exe: string, args: string[], opts: object) => { unref: () => void }>();
const existsSyncMock = vi.fn();

vi.mock("@raycast/api", () => ({
  open: (...args: unknown[]) => openMock(...args),
  getApplications: (...args: unknown[]) => getApplicationsMock(...args),
}));

vi.mock("../constants", () => ({
  FIREFOX_APP_NAME: "Firefox",
}));

vi.mock("../utils/windows/powershell", async () => {
  const actual = await vi.importActual<typeof import("../utils/windows/powershell")>("../utils/windows/powershell");
  return {
    ...actual,
    runPowerShell: (...args: unknown[]) => runPowerShellMock(...args),
  };
});

vi.mock("child_process", () => ({
  spawn: (exe: string, args: string[], opts: object) => spawnMock(exe, args, opts),
}));

vi.mock("fs", () => ({
  existsSync: (...args: unknown[]) => existsSyncMock(...args),
}));

import { openInFirefox } from "../services/open-in-firefox";
import type { OpenTarget } from "../types";

const target: OpenTarget = { kind: "url", url: "https://example.com" };
const FAKE_FIREFOX_EXE = "C:\\Program Files\\Mozilla Firefox\\firefox.exe";

describe("openInFirefox", () => {
  beforeEach(() => {
    openMock.mockReset();
    runPowerShellMock.mockReset();
    spawnMock.mockReset();
    existsSyncMock.mockReset();
    getApplicationsMock.mockReset();
    spawnMock.mockReturnValue({ unref: vi.fn() });
    process.env.PROGRAMFILES = "C:\\Program Files";
  });

  it("spawns firefox with -new-window when the executable is found via getApplications", async () => {
    getApplicationsMock.mockResolvedValue([{ name: "Mozilla Firefox", path: FAKE_FIREFOX_EXE }]);

    await openInFirefox(target, { forceNewWindow: true });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [exe, args, opts] = spawnMock.mock.calls[0];
    expect(exe).toBe(FAKE_FIREFOX_EXE);
    expect(args).toEqual(["-new-window", "https://example.com"]);
    expect(opts).toMatchObject({ detached: true, stdio: "ignore" } as object);
    expect(runPowerShellMock).not.toHaveBeenCalled();
  });

  it("spawns firefox with -new-tab when forceNewTab is set", async () => {
    getApplicationsMock.mockResolvedValue([{ name: "Mozilla Firefox", path: FAKE_FIREFOX_EXE }]);

    await openInFirefox(target, { forceNewTab: true });

    const [, args] = spawnMock.mock.calls[0];
    expect(args).toEqual(["-new-tab", "https://example.com"]);
    expect(runPowerShellMock).not.toHaveBeenCalled();
  });

  it("prioritizes forceNewWindow over forceNewTab", async () => {
    getApplicationsMock.mockResolvedValue([{ name: "Mozilla Firefox", path: FAKE_FIREFOX_EXE }]);

    await openInFirefox(target, { forceNewWindow: true, forceNewTab: true });

    const [, priorityArgs] = spawnMock.mock.calls[0];
    expect(priorityArgs[0]).toBe("-new-window");
  });

  it("falls back to common install paths when getApplications returns no .exe", async () => {
    getApplicationsMock.mockResolvedValue([{ name: "Mozilla Firefox", path: "C:\\shortcut.lnk" }]);
    existsSyncMock.mockReturnValue(true);

    await openInFirefox(target, { forceNewWindow: true });

    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [exe] = spawnMock.mock.calls[0];
    expect(exe).toContain("firefox.exe");
    expect(runPowerShellMock).not.toHaveBeenCalled();
  });

  it("falls back to PowerShell when no executable can be resolved", async () => {
    getApplicationsMock.mockResolvedValue([]);
    existsSyncMock.mockReturnValue(false);

    await openInFirefox(target, { forceNewWindow: true });

    expect(spawnMock).not.toHaveBeenCalled();
    expect(runPowerShellMock).toHaveBeenCalledTimes(1);
    const script = runPowerShellMock.mock.calls[0][0] as string;
    expect(script).toContain("-new-window");
    expect(script).toContain("'https://example.com'");
  });

  it("escapes single quotes in the URL when falling back to PowerShell", async () => {
    getApplicationsMock.mockResolvedValue([]);
    existsSyncMock.mockReturnValue(false);

    await openInFirefox({ kind: "url", url: "https://example.com/'evil" }, { forceNewWindow: true });

    const script = runPowerShellMock.mock.calls[0][0] as string;
    expect(script).toContain("'https://example.com/''evil'");
  });

  it("uses open() directly for non-http(s) URLs instead of spawning", async () => {
    await openInFirefox({ kind: "url", url: "about:blank" }, { forceNewWindow: true });

    expect(spawnMock).not.toHaveBeenCalled();
    expect(runPowerShellMock).not.toHaveBeenCalled();
    expect(openMock).toHaveBeenCalledWith("about:blank", "Firefox");
  });

  it("uses open() with the Firefox app by default (no forceNew flags)", async () => {
    await openInFirefox(target);

    expect(openMock).toHaveBeenCalledWith("https://example.com", "Firefox");
    expect(runPowerShellMock).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
