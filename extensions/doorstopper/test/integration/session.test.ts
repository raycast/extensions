import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LocalStorage } from "@raycast/api";
import { disable, enable, enforce, getStatus } from "../../src/lib/session";
import { installRule } from "../../src/lib/system";
import type { Session } from "../../src/lib/parse";
import { OSASCRIPT, useFakeMac } from "./fake-mac";
import { raycast, resetRaycast } from "./fake-raycast";

// Real session.ts, system.ts and parse.ts against a simulated Mac. Only the Raycast API and the OS commands are faked.

vi.mock("node:child_process", () => ({ execFile: vi.fn(), exec: vi.fn() }));
vi.mock("node:fs", () => ({ existsSync: vi.fn(), readFileSync: vi.fn() }));
vi.mock("node:os", () => {
  const mocked = { userInfo: vi.fn() };
  return { ...mocked, default: mocked };
});
vi.mock("@raycast/api", async () => (await import("./fake-raycast")).raycastApi);
vi.mock("@raycast/utils", async () => (await import("./fake-raycast")).raycastUtils);

const mac = useFakeMac();

const MINUTE = 60_000;

async function storedSessionKeys(): Promise<string[]> {
  return Object.keys(await LocalStorage.allItems()).filter((key) => key.startsWith("session:"));
}

// endsAt must fall between `minutes` after the time before the call and `minutes` after the time after it.
function expectEndsIn(endsAt: number | null | undefined, minutes: number, before: number, after: number): void {
  expect(endsAt).toBeGreaterThanOrEqual(before + minutes * MINUTE);
  expect(endsAt).toBeLessThanOrEqual(after + minutes * MINUTE);
}

beforeEach(async () => {
  resetRaycast();
  // Set up the passwordless rule the way the setup command does, through the admin prompt.
  await installRule();
  mac.clearLog();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("starting and stopping", () => {
  it("keeps the Mac awake for 30 minutes and records one session that ends in 30 minutes", async () => {
    const before = Date.now();
    await enable(30);
    const after = Date.now();

    expect(mac.sleepDisabled).toBe(true);
    const status = await getStatus();
    expect(status.on).toBe(true);
    expectEndsIn(status.session?.endsAt, 30, before, after);
    expect(await storedSessionKeys()).toHaveLength(1);
    expect(raycast.launchCommand).toHaveBeenCalledWith(expect.objectContaining({ name: "statusmenu" }));
    expect(mac.log.some((call) => call.file === OSASCRIPT)).toBe(false);
  });

  it("keeps the Mac awake indefinitely when the duration is null, with no end time", async () => {
    await enable(null);

    const status = await getStatus();
    expect(status.on).toBe(true);
    expect(status.session?.endsAt).toBeNull();
    expect(mac.sleepDisabled).toBe(true);
  });

  it("allows sleep again and removes every session when disabled", async () => {
    await enable(30);

    await disable();

    expect(mac.sleepDisabled).toBe(false);
    expect((await getStatus()).on).toBe(false);
    expect(await storedSessionKeys()).toEqual([]);
  });

  it("stores the boot time of the Mac with the session", async () => {
    await enable(30);

    const [key] = await storedSessionKeys();
    const session = JSON.parse(raycast.store.get(key) ?? "{}") as Session;
    expect(session.bootTime).toBe(mac.bootTime);
  });
});

describe("automatic turn-off", () => {
  it("keeps sleep disabled before the timer ends", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    await enable(30);

    vi.setSystemTime(start + 29 * MINUTE);

    await expect(enforce()).resolves.toBeNull();
    expect(mac.sleepDisabled).toBe(true);
    expect((await getStatus()).on).toBe(true);
  });

  it("allows sleep again once the timer has run out", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    await enable(30);

    vi.setSystemTime(start + 31 * MINUTE);

    await expect(enforce()).resolves.toBe("timer");
    expect(mac.sleepDisabled).toBe(false);
    expect((await getStatus()).on).toBe(false);
  });

  it("turns sleep off after a restart, when the Mac's boot time no longer matches the stored one", async () => {
    await enable(60);
    mac.bootTime += 3600;

    await expect(enforce()).resolves.toBe("restart");

    expect(mac.sleepDisabled).toBe(false);
    expect((await getStatus()).on).toBe(false);
  });

  it("reports the session as off, and removes it, when sleep was turned back on outside the extension", async () => {
    await enable(30);

    mac.sleepDisabled = false;

    const status = await getStatus();
    expect(status.on).toBe(false);
    expect(status.session).toBeNull();
    expect(await storedSessionKeys()).toEqual([]);
  });

  it("keeps a new 60 minute session when a Start overlaps the expiry of the previous one", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    await enable(5);
    vi.setSystemTime(start + 6 * MINUTE);
    const before = Date.now();

    await Promise.all([enforce(), enable(60)]);
    const after = Date.now();

    expect(mac.sleepDisabled).toBe(true);
    const status = await getStatus();
    expect(status.on).toBe(true);
    expectEndsIn(status.session?.endsAt, 60, before, after);
  });
});

describe("without the passwordless rule", () => {
  beforeEach(() => {
    mac.sudoersFiles.clear();
  });

  it("enables indefinitely through the password prompt and stores no session", async () => {
    await enable(null);

    expect(mac.sleepDisabled).toBe(true);
    expect(mac.log.filter((call) => call.file === "runAppleScript")).toHaveLength(1);
    expect(await storedSessionKeys()).toEqual([]);
  });

  it("leaves a prompt-enabled Mac alone on the menu bar's checks, even after a restart", async () => {
    await enable(null);
    mac.bootTime += 3600;

    await expect(enforce()).resolves.toBeNull();
    expect(mac.sleepDisabled).toBe(true);
  });

  it("drops a timer saved before the rule was removed, so the menu bar never tries to end it without a prompt", async () => {
    await installRule();
    await enable(30);
    mac.sudoersFiles.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 31 * MINUTE);

    await enable(null);

    expect(await storedSessionKeys()).toEqual([]);
    await expect(enforce()).resolves.toBeNull();
    expect(mac.sleepDisabled).toBe(true);
  });

  it("disables through the password prompt", async () => {
    await enable(null);

    await disable();

    expect(mac.sleepDisabled).toBe(false);
    expect(mac.log.filter((call) => call.file === "runAppleScript")).toHaveLength(2);
  });
});

describe("indefinite sessions with the rule", () => {
  it("are ended by the menu bar after a restart", async () => {
    await enable(null);
    mac.bootTime += 3600;

    await expect(enforce()).resolves.toBe("restart");
    expect(mac.sleepDisabled).toBe(false);
  });

  it("are ended by the menu bar when the battery drops to the cutoff", async () => {
    await enable(null);
    mac.battery = { present: true, percent: 20, onAC: false };

    await expect(enforce()).resolves.toBe("battery");
    expect(mac.sleepDisabled).toBe(false);
  });

  it("never time out", async () => {
    await enable(null);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 30 * 24 * 60 * MINUTE);

    await expect(enforce()).resolves.toBeNull();
    expect(mac.sleepDisabled).toBe(true);
  });
});

describe("overlapping actions", () => {
  it("ends with one session, the later one, when two Starts run at once", async () => {
    const before = Date.now();
    await Promise.all([enable(30), enable(120)]);
    const after = Date.now();

    expect(mac.sleepDisabled).toBe(true);
    expect(await storedSessionKeys()).toHaveLength(1);
    expectEndsIn((await getStatus()).session?.endsAt, 120, before, after);
  });

  it("keeps another Start's timer when the first Start's menu bar launch fails after the second Start saved", async () => {
    let rejectFirstLaunch!: (error: Error) => void;
    raycast.launchCommand.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirstLaunch = reject;
        }),
    );

    const first = enable(30);
    await vi.waitFor(() => expect(raycast.launchCommand).toHaveBeenCalledTimes(1));
    const before = Date.now();
    await enable(60);
    const after = Date.now();
    rejectFirstLaunch(new Error("menu bar command is not enabled"));

    await expect(first).rejects.toThrow("Run Doorstopper Status Menu Bar once");
    expect(mac.sleepDisabled).toBe(true);
    expect(await storedSessionKeys()).toHaveLength(1);
    expectEndsIn((await getStatus()).session?.endsAt, 60, before, after);
  });

  it("leaves sleep allowed and no session when a Turn Off in another command runs right after a Start saves", async () => {
    let fired = false;
    raycast.afterSetItem = (key) => {
      if (!fired && key.startsWith("session:")) {
        fired = true;
        mac.sleepDisabled = false;
        raycast.store.clear();
      }
    };

    await enable(30);

    expect(fired).toBe(true);
    expect(mac.sleepDisabled).toBe(false);
    expect(await storedSessionKeys()).toEqual([]);
  });

  it("leaves sleep allowed when a Start in another command disables it while a Turn Off clears the sessions", async () => {
    await enable(30);
    let fired = false;
    raycast.afterRemoveItem = (key) => {
      if (!fired && key.startsWith("session:")) {
        fired = true;
        mac.sleepDisabled = true;
      }
    };

    await disable();

    expect(fired).toBe(true);
    expect(mac.sleepDisabled).toBe(false);
    expect(await storedSessionKeys()).toEqual([]);
  });
});

describe("when the menu bar cannot launch", () => {
  it("rejects Start, leaves sleep allowed, and stores no session", async () => {
    raycast.launchCommand.mockRejectedValueOnce(new Error("menu bar command is not enabled"));

    await expect(enable(30)).rejects.toThrow("Run Doorstopper Status Menu Bar once");

    expect(mac.sleepDisabled).toBe(false);
    expect(await storedSessionKeys()).toEqual([]);
  });
});

describe("battery cutoff", () => {
  it("refuses to start on battery at or below the cutoff, and leaves sleep allowed", async () => {
    mac.battery = { present: true, percent: 20, onAC: false };

    await expect(enable(30)).rejects.toThrow("Battery is at 20%, at or below your 20% cutoff");

    expect(mac.sleepDisabled).toBe(false);
    expect(await storedSessionKeys()).toEqual([]);
  });

  it("starts on battery above the cutoff", async () => {
    mac.battery = { present: true, percent: 21, onAC: false };

    await enable(30);

    expect(mac.sleepDisabled).toBe(true);
  });

  it("turns Lid Awake off with reason battery once the battery drops to the cutoff", async () => {
    await enable(60);
    mac.battery = { present: true, percent: 20, onAC: false };

    await expect(enforce()).resolves.toBe("battery");

    expect(mac.sleepDisabled).toBe(false);
    expect((await getStatus()).on).toBe(false);
    expect(await storedSessionKeys()).toEqual([]);
  });

  it("keeps Lid Awake on while the battery is above the cutoff", async () => {
    await enable(60);
    mac.battery = { present: true, percent: 21, onAC: false };

    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(true);
  });

  it("never cuts off on AC power, even when the battery is below the cutoff", async () => {
    mac.battery = { present: true, percent: 5, onAC: true };

    await enable(60);
    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(true);
  });

  it("never cuts off on a Mac without a battery", async () => {
    raycast.prefs.batteryThreshold = "100";
    mac.battery = { present: false, percent: 0, onAC: true };

    await enable(60);
    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(true);
  });

  it("never cuts off when the cutoff is Off (0)", async () => {
    raycast.prefs.batteryThreshold = "0";
    mac.battery = { present: true, percent: 5, onAC: false };

    await enable(60);
    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(true);
  });
});

describe("storage read failures", () => {
  it("keeps sleep disabled when the read after the save fails, after auto-off turned sleep off", async () => {
    let fired = false;
    raycast.afterSetItem = (key) => {
      if (!fired && key.startsWith("session:")) {
        fired = true;
        // Auto-off turns sleep off right after the save. The next read is the cleanup of older sessions, which must
        // succeed, and the read after it is the post-save check, which must fail.
        mac.sleepDisabled = false;
        raycast.storageFaults = { skip: 1, fail: 1 };
      }
    };

    await enable(30);

    expect(fired).toBe(true);
    expect(raycast.storageFaults).toEqual({ skip: 0, fail: 0 });
    expect(mac.sleepDisabled).toBe(true);
    expect(await storedSessionKeys()).toHaveLength(1);
  });

  it("keeps the timer when both reads after the save fail, and the next check leaves it running", async () => {
    let fired = false;
    raycast.afterSetItem = (key) => {
      if (!fired && key.startsWith("session:")) {
        fired = true;
        // Auto-off turns sleep off right after the save. The cleanup read succeeds, then both post-save reads fail.
        mac.sleepDisabled = false;
        raycast.storageFaults = { skip: 1, fail: 2 };
      }
    };

    await enable(30);

    expect(fired).toBe(true);
    expect(raycast.storageFaults).toEqual({ skip: 0, fail: 0 });
    expect(mac.sleepDisabled).toBe(true);
    expect(await storedSessionKeys()).toHaveLength(1);

    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(true);
    expect(await storedSessionKeys()).toHaveLength(1);
    // The read confirmed the session, so the pending check is settled.
    expect(raycast.store.has("recheck")).toBe(false);
  });

  it("leaves another app's sleep setting alone after a pending check was settled by a stored session", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    let fired = false;
    raycast.afterSetItem = (key) => {
      if (!fired && key.startsWith("session:")) {
        fired = true;
        mac.sleepDisabled = false;
        raycast.storageFaults = { skip: 1, fail: 2 };
      }
    };
    await enable(30);
    await expect(enforce()).resolves.toBeNull();
    vi.setSystemTime(start + 31 * MINUTE);
    await expect(enforce()).resolves.toBe("timer");
    expect(mac.sleepDisabled).toBe(false);

    // Another app disables sleep after the timer ended.
    mac.sleepDisabled = true;
    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(true);
  });

  it("keeps a pending check when allowing sleep fails, and finishes it on the next check", async () => {
    raycast.afterSetItem = (key) => {
      if (key.startsWith("session:")) {
        raycast.afterSetItem = undefined;
        mac.sleepDisabled = false;
        raycast.store.clear();
        raycast.storageFaults = { skip: 1, fail: 2 };
      }
    };
    await enable(30);
    expect(mac.sleepDisabled).toBe(true);

    // Without the passwordless rule, allowing sleep fails. The error reaches the menu bar and the check stays pending.
    const rules = new Map(mac.sudoersFiles);
    mac.sudoersFiles.clear();
    await expect(enforce()).rejects.toThrow();
    expect(mac.sleepDisabled).toBe(true);
    expect(raycast.store.has("recheck")).toBe(true);

    mac.sudoersFiles = rules;
    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.store.has("recheck")).toBe(false);
  });

  it("allows sleep on the next check when a Turn Off cleared the sessions while a Start's reads failed", async () => {
    let fired = false;
    raycast.afterSetItem = (key) => {
      if (!fired && key.startsWith("session:")) {
        fired = true;
        // Turn Off in another command allows sleep and clears the sessions right after the save. The cleanup read
        // succeeds, then both post-save reads fail, so the Start cannot see that the sessions are gone.
        mac.sleepDisabled = false;
        raycast.store.clear();
        raycast.storageFaults = { skip: 1, fail: 2 };
      }
    };

    await enable(30);

    expect(fired).toBe(true);
    expect(raycast.storageFaults).toEqual({ skip: 0, fail: 0 });
    expect(mac.sleepDisabled).toBe(true);
    expect(await storedSessionKeys()).toEqual([]);

    // Storage is still failing on the first check, so the check stays pending and the Mac stays awake.
    raycast.storageFaults = { skip: 0, fail: 2 };
    await expect(enforce()).resolves.toBeNull();
    expect(raycast.storageFaults).toEqual({ skip: 0, fail: 0 });
    expect(mac.sleepDisabled).toBe(true);

    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(false);
    expect(raycast.store.has("recheck")).toBe(false);
  });

  it("leaves sleep disabled outside the extension alone when no check is pending", async () => {
    mac.sleepDisabled = true;

    await expect(enforce()).resolves.toBeNull();

    expect(mac.sleepDisabled).toBe(true);
  });

  it("keeps the Mac awake when the read after auto-off allows sleep fails, then turns it off on the next check", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.now();
    await enable(30);
    vi.setSystemTime(start + 31 * MINUTE);
    // enforce reads storage once before it allows sleep (skip), then the read that checks for a newer session fails.
    raycast.storageFaults = { skip: 1, fail: 1 };

    await expect(enforce()).resolves.toBeNull();

    expect(raycast.storageFaults).toEqual({ skip: 0, fail: 0 });
    expect(mac.sleepDisabled).toBe(true);
    expect(await storedSessionKeys()).toHaveLength(1);

    await expect(enforce()).resolves.toBe("timer");

    expect(mac.sleepDisabled).toBe(false);
    expect(await storedSessionKeys()).toEqual([]);
  });
});
