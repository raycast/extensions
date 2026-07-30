import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({ applicationChannel: "canary" }),
}));
vi.mock("@raycast/utils", () => ({
  runAppleScript: vi.fn(),
}));

import {
  AppleScriptRunner,
  classifyAppleScriptError,
  MINIMUM_PHI_VERSION,
  parseApplicationChannel,
  PhiClient,
} from "../src/phi";

const version = JSON.stringify({
  schemaVersion: 1,
  ok: true,
  apiVersion: 1,
  version: MINIMUM_PHI_VERSION,
  build: "456",
});
const acknowledgement = JSON.stringify({ schemaVersion: 1, ok: true });
const chromiumDataDirectory = JSON.stringify({
  schemaVersion: 1,
  ok: true,
  chromiumDataDirectory:
    "/Users/test/Library/Application Support/com.phibrowser.Mac",
});

function clientContext(call: [string, string[], unknown] | undefined) {
  const raw = call?.[1].at(-1);
  expect(raw).toBeTypeOf("string");
  return JSON.parse(raw as string) as {
    schemaVersion: number;
    clientId: string;
    clientCommand: string;
    invocationId: string;
  };
}

describe("Phi AppleScript adapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uses only the two known bundle identifiers", async () => {
    const stableRunner = vi.fn<AppleScriptRunner>().mockResolvedValue(version);
    const canaryRunner = vi.fn<AppleScriptRunner>().mockResolvedValue(version);

    await new PhiClient(stableRunner, "stable").getVersion();
    await new PhiClient(canaryRunner, "canary").getVersion();

    expect(stableRunner.mock.calls[0]?.[0]).toContain(
      'application id "com.phibrowser.Mac"',
    );
    expect(canaryRunner.mock.calls[0]?.[0]).toContain(
      'application id "com.phibrowser.canary.Mac"',
    );
    expect(canaryRunner.mock.calls[0]?.[2]).toEqual({
      timeout: 30_000,
      humanReadableOutput: true,
    });
    expect(clientContext(canaryRunner.mock.calls[0])).toMatchObject({
      schemaVersion: 1,
      clientId: "raycast",
      clientCommand: "unknown",
    });
    expect(parseApplicationChannel("stable")).toBe("stable");
    expect(() => parseApplicationChannel("arbitrary.app")).toThrowError(
      expect.objectContaining({ kind: "invalidArgument" }),
    );
  });

  it("passes dynamic values through argv without interpolating them into source", async () => {
    const dangerous = 'quoted "value" \\ and $(command)';
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce(version)
      .mockResolvedValueOnce(acknowledgement);
    const client = new PhiClient(runner, "canary");

    await client.openTab(dangerous, "space-a");

    const call = runner.mock.calls[1];
    expect(call?.[0]).not.toContain(dangerous);
    expect(call?.[1].slice(0, 2)).toEqual([dangerous, "space-a"]);
    expect(call?.[0]).toContain(
      "open tab address requestedAddress space id requestedSpaceId client context requestedClientContext",
    );
    expect(clientContext(call).invocationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(call?.[2]).toEqual({ timeout: 5_000, humanReadableOutput: true });
  });

  it("reopens and activates Phi before activating a Space", async () => {
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce(version)
      .mockResolvedValueOnce(acknowledgement);
    const client = new PhiClient(runner, "canary");

    await client.activateSpace("space-a");

    const call = runner.mock.calls[1];
    expect(call?.[1].slice(0, 1)).toEqual(["space-a"]);
    expect(call?.[0]).toContain(
      `tell application id "com.phibrowser.canary.Mac"
    reopen
    activate
    activate space space id requestedSpaceId client context requestedClientContext
  end tell`,
    );
  });

  it("always sends window and tab IDs together", async () => {
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce(version)
      .mockResolvedValueOnce(acknowledgement)
      .mockResolvedValueOnce(acknowledgement)
      .mockResolvedValueOnce(acknowledgement)
      .mockResolvedValueOnce(acknowledgement)
      .mockResolvedValueOnce(acknowledgement);
    const client = new PhiClient(runner, "canary");
    const target = { id: "tab-7", windowId: "window-9" };

    await client.activateTab(target);
    await client.closeTab(target);
    await client.reloadTab(target);
    await client.forceReloadTab(target);
    await client.addSplitView(target);

    expect(
      runner.mock.calls.slice(1).map((call) => call[1].slice(0, 2)),
    ).toEqual([
      ["window-9", "tab-7"],
      ["window-9", "tab-7"],
      ["window-9", "tab-7"],
      ["window-9", "tab-7"],
      ["window-9", "tab-7"],
    ]);
    expect(runner.mock.calls[4]?.[0]).toContain("to force reload tab");
    expect(runner.mock.calls[5]?.[0]).toContain("to add split view");
  });

  it("sends saved item IDs together with their target Space", async () => {
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce(version)
      .mockResolvedValueOnce(acknowledgement)
      .mockResolvedValueOnce(acknowledgement);
    const client = new PhiClient(runner, "canary");

    await client.openPinnedTab("space-a", "pin-a");
    await client.openBookmark("space-b", "bookmark-b");

    expect(runner.mock.calls[1]?.[1].slice(0, 2)).toEqual(["space-a", "pin-a"]);
    expect(runner.mock.calls[1]?.[0]).toContain("to open pinned tab");
    expect(runner.mock.calls[2]?.[1].slice(0, 2)).toEqual([
      "space-b",
      "bookmark-b",
    ]);
    expect(runner.mock.calls[2]?.[0]).toContain("to open bookmark");
  });

  it("routes normal and incognito window commands without arguments", async () => {
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce(version)
      .mockResolvedValueOnce(acknowledgement)
      .mockResolvedValueOnce(acknowledgement);
    const client = new PhiClient(runner, "canary");

    await client.newWindow();
    await client.newIncognitoWindow();

    expect(runner.mock.calls[1]?.[0]).toContain("to create phi window");
    expect(runner.mock.calls[2]?.[0]).toContain(
      "to create phi incognito window",
    );
    expect(runner.mock.calls.slice(1).map((call) => call[1])).toEqual([
      [expect.any(String)],
      [expect.any(String)],
    ]);
  });

  it("queries the running Phi process for its Chromium data directory", async () => {
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce("true")
      .mockResolvedValueOnce(chromiumDataDirectory);
    const client = new PhiClient(runner, "stable");

    await expect(client.getChromiumDataDirectoryIfRunning()).resolves.toBe(
      "/Users/test/Library/Application Support/com.phibrowser.Mac",
    );

    expect(runner).toHaveBeenCalledTimes(2);
    expect(runner.mock.calls[0]?.[0]).toContain(
      'return application "Phi" is running',
    );
    expect(runner.mock.calls[1]?.[0]).toContain(
      'if application "Phi" is not running then',
    );
    expect(runner.mock.calls[1]?.[0]).toContain(
      "to get chromium data directory client context requestedClientContext",
    );
    expect(runner.mock.calls[1]?.[2]).toEqual({
      timeout: 30_000,
      humanReadableOutput: true,
    });
  });

  it("does not query or launch Phi when it is not running", async () => {
    const runner = vi.fn<AppleScriptRunner>().mockResolvedValueOnce("false");
    const client = new PhiClient(runner, "canary");

    await expect(
      client.getChromiumDataDirectoryIfRunning(),
    ).resolves.toBeUndefined();
    expect(runner).toHaveBeenCalledOnce();
    expect(runner.mock.calls[0]?.[0]).toContain(
      'return application "Phi Canary" is running',
    );
    expect(runner.mock.calls[0]?.[0]).not.toContain(
      "get chromium data directory",
    );
  });

  it("falls back when Phi exits between the running check and query", async () => {
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce("true")
      .mockResolvedValueOnce("__PHI_NOT_RUNNING__");
    const client = new PhiClient(runner, "canary");

    await expect(
      client.getChromiumDataDirectoryIfRunning(),
    ).resolves.toBeUndefined();
  });

  it("falls back when the running Phi build does not support the directory command", async () => {
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce("true")
      .mockRejectedValueOnce(
        new Error("Phi doesn't understand the message. (-1708)"),
      );
    const client = new PhiClient(runner, "stable");

    await expect(
      client.getChromiumDataDirectoryIfRunning(),
    ).resolves.toBeUndefined();
  });

  it("caches a successful API compatibility check", async () => {
    const spaces = JSON.stringify({ schemaVersion: 1, ok: true, spaces: [] });
    const tabs = JSON.stringify({
      schemaVersion: 1,
      ok: true,
      tabs: [],
      pinnedTabs: [],
      bookmarks: [],
      targetSpaceId: null,
    });
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce(version)
      .mockResolvedValueOnce(spaces)
      .mockResolvedValueOnce(tabs);
    const client = new PhiClient(runner, "canary");

    await client.getSpaces();
    await client.getTabs({ kind: "current" });

    expect(runner).toHaveBeenCalledTimes(3);
    expect(runner.mock.calls[2]?.[1].slice(0, 2)).toEqual(["current", ""]);
  });

  it("accepts the minimum Phi version", async () => {
    const spaces = JSON.stringify({ schemaVersion: 1, ok: true, spaces: [] });
    const runner = vi
      .fn<AppleScriptRunner>()
      .mockResolvedValueOnce(version)
      .mockResolvedValueOnce(spaces);

    await expect(new PhiClient(runner, "stable").getSpaces()).resolves.toEqual(
      [],
    );
  });

  it("rejects Phi versions below 2.4.0 and retries after a failed check", async () => {
    const oldVersion = JSON.stringify({
      schemaVersion: 1,
      ok: true,
      apiVersion: 0,
      version: "2.3.99",
      build: "1",
    });
    const runner = vi.fn<AppleScriptRunner>().mockResolvedValue(oldVersion);
    const client = new PhiClient(runner, "stable");

    await expect(client.getSpaces()).rejects.toMatchObject({
      kind: "minimumVersionNotMet",
      message: "Phi 2.4.0 or later is required. Update Phi and try again.",
    });
    await expect(client.getSpaces()).rejects.toMatchObject({
      kind: "minimumVersionNotMet",
    });
    expect(runner).toHaveBeenCalledTimes(2);
  });

  it("enforces a command-specific minimum version", async () => {
    const runner = vi.fn<AppleScriptRunner>().mockResolvedValue(version);
    const client = new PhiClient(runner, "stable");

    await expect(client.requireVersion("2.6.0")).rejects.toMatchObject({
      kind: "minimumVersionNotMet",
      message: "Phi 2.6.0 or later is required. Update Phi and try again.",
    });
    expect(runner).toHaveBeenCalledOnce();
  });

  it("skips application version checks for Canary", async () => {
    const canaryVersion = JSON.stringify({
      schemaVersion: 1,
      ok: true,
      apiVersion: 1,
      version: "1.0.0",
      build: "1",
    });
    const runner = vi.fn<AppleScriptRunner>().mockResolvedValue(canaryVersion);
    const client = new PhiClient(runner, "canary");

    await expect(client.requireVersion("99.0.0")).resolves.toMatchObject({
      apiVersion: 1,
      version: "1.0.0",
    });
    expect(runner).toHaveBeenCalledOnce();
  });

  it("rejects an older scripting API on a supported Phi version", async () => {
    const oldVersion = JSON.stringify({
      schemaVersion: 1,
      ok: true,
      apiVersion: 0,
      version: "2.5.0",
      build: "1",
    });
    const client = new PhiClient(
      vi.fn<AppleScriptRunner>().mockResolvedValue(oldVersion),
      "canary",
    );

    await expect(client.getSpaces()).rejects.toMatchObject({
      kind: "unsupportedVersion",
      message: "Update Phi to a version that supports scripting API version 1.",
    });
  });

  it.each([
    [
      new Error("Not authorized to send Apple events. (-1743)"),
      "permissionDenied",
    ],
    [new Error("Process timed out and received SIGTERM"), "timeout"],
    [new Error("Application isn't running. (-600)"), "unavailable"],
    [
      new Error("Phi doesn't understand the message. (-1708)"),
      "minimumVersionNotMet",
    ],
    [new Error("Unexpected osascript failure"), "unknown"],
  ])(
    "classifies AppleScript failures without exposing browsing data",
    (error, kind) => {
      expect(classifyAppleScriptError(error)).toMatchObject({ kind });
    },
  );

  it("prompts users on Phi versions that predate the scripting command", () => {
    expect(
      classifyAppleScriptError(
        new Error("Phi doesn't understand the message. (-1708)"),
      ),
    ).toMatchObject({
      kind: "minimumVersionNotMet",
      message: "Phi 2.4.0 or later is required. Update Phi and try again.",
    });
  });

  it("does not report a semantic version requirement for Canary", () => {
    expect(
      classifyAppleScriptError(
        new Error("Phi doesn't understand the message. (-1708)"),
        "canary",
      ),
    ).toMatchObject({
      kind: "unsupportedVersion",
      message:
        "Update Phi Canary to a build that supports Raycast integration.",
    });
  });
});
