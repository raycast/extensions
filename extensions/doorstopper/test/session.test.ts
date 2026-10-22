import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as system from "../src/lib/system";
import { disable, durationLabel, enable, enforce, getDefaultMinutes, getStatus } from "../src/lib/session";
import { LocalStorage } from "@raycast/api";
import type { Battery, Session } from "../src/lib/parse";

const raycast = vi.hoisted(() => ({
  store: new Map<string, string>(),
  prefs: { batteryThreshold: "20", defaultDuration: "60" } as Record<string, string>,
  launchCommand: vi.fn(),
  // When set, the next allItems read rejects, then the flag clears. A test sets it inside a mock to fail the read it needs.
  failNextAllItems: false,
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => raycast.prefs,
  launchCommand: raycast.launchCommand,
  LaunchType: { Background: "background", UserInitiated: "userInitiated" },
  LocalStorage: {
    getItem: async (key: string) => raycast.store.get(key),
    allItems: async () => {
      if (raycast.failNextAllItems) {
        raycast.failNextAllItems = false;
        throw new Error("storage unavailable");
      }
      return Object.fromEntries(raycast.store);
    },
    setItem: async (key: string, value: string) => {
      raycast.store.set(key, value);
    },
    removeItem: async (key: string) => {
      raycast.store.delete(key);
    },
  },
}));

vi.mock("../src/lib/system", () => ({
  isRuleInstalled: vi.fn(),
  isSleepDisabled: vi.fn(),
  getBattery: vi.fn(),
  getBootTime: vi.fn(),
  setSleepDisabled: vi.fn(),
}));

const NOW = new Date("2024-10-11T09:00:00Z").getTime();
const MINUTE = 60_000;
const BOOT = 1728633600;
const ON_BATTERY_80: Battery = { hasBattery: true, percent: 80, onAC: false };

// The session keys only, without the sequence counter that is stored next to them.
function sessionKeys(): string[] {
  return [...raycast.store.keys()].filter((key) => key.startsWith("session:"));
}

// The next sequence number after the stored session keys, as a new Start would compute it.
function nextSeq(): number {
  const seqs = [...raycast.store.keys()]
    .filter((key) => key.startsWith("session:"))
    .map((key) => Number(key.slice("session:".length)));
  return Math.max(0, ...seqs) + 1;
}

// Stores a session under session:<seq>, by default the next sequence number. Returns the sequence number used.
function seedSession(session: Session, seq = nextSeq()): number {
  raycast.store.set(`session:${seq}`, JSON.stringify(session));
  return seq;
}

// The stored session with the highest sequence number, which is the one the extension treats as current.
function storedSession(): Session | null {
  const sessions = [...raycast.store.entries()]
    .filter(([key]) => key.startsWith("session:"))
    .map(([key, raw]) => ({ seq: Number(key.slice("session:".length)), session: JSON.parse(raw) as Session }));
  return sessions.sort((a, b) => b.seq - a.seq)[0]?.session ?? null;
}

function setBattery(battery: Battery): void {
  vi.mocked(system.getBattery).mockResolvedValue(battery);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);

  vi.resetAllMocks();
  raycast.store.clear();
  raycast.failNextAllItems = false;
  raycast.prefs = { batteryThreshold: "20", defaultDuration: "60" };
  raycast.launchCommand.mockResolvedValue(undefined);

  vi.mocked(system.isRuleInstalled).mockResolvedValue(true);
  vi.mocked(system.isSleepDisabled).mockResolvedValue(false);
  vi.mocked(system.getBattery).mockResolvedValue(ON_BATTERY_80);
  vi.mocked(system.getBootTime).mockResolvedValue(BOOT);
  vi.mocked(system.setSleepDisabled).mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("enable", () => {
  it("turns sleep off, stores a timed session with the boot time, and refreshes the menu bar", async () => {
    await enable(60);

    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
    expect(raycast.launchCommand).toHaveBeenCalledWith({ name: "statusmenu", type: "background" });
  });

  it("turns sleep on again when auto-off turned it off while the session was saved", async () => {
    // The default mock reports sleep off after the save, as if auto-off ran between the two steps.
    await enable(60);

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true], [true]]);
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
  });

  it("turns sleep on again when the read after the post-save check fails", async () => {
    // The post-save check finds sleep allowed, and the storage read that decides whether to turn it off again fails.
    vi.mocked(system.isSleepDisabled).mockImplementationOnce(async () => {
      raycast.failNextAllItems = true;
      return false;
    });

    await enable(60);

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true], [true]]);
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
  });

  it("keeps sleep on when the re-check after turning sleep on again fails to read storage", async () => {
    vi.mocked(system.setSleepDisabled)
      .mockResolvedValueOnce(undefined)
      .mockImplementationOnce(async () => {
        // Sleep is turned off again, and the re-check that follows fails to read storage.
        raycast.failNextAllItems = true;
      });

    await enable(60);

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true], [true]]);
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
  });

  it("turns sleep on only once when sleep is still on after the session is saved", async () => {
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await enable(60);

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true]]);
  });

  it("refuses to turn on when the passwordless rule is not installed, without touching sleep", async () => {
    vi.mocked(system.isRuleInstalled).mockResolvedValue(false);

    await expect(enable(60)).rejects.toThrow(
      "Run Set up Passwordless Doorstopper first, so Doorstopper can disable itself while the lid is closed",
    );
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    expect(storedSession()).toBeNull();
  });

  it("refuses a timer without the rule even when the menu bar runs, so a timer can never be left unenforced", async () => {
    vi.mocked(system.isRuleInstalled).mockResolvedValue(false);

    await expect(enable(30)).rejects.toThrow("Run Set up Passwordless Doorstopper first");
    expect(raycast.launchCommand).not.toHaveBeenCalled();
  });
  it("does not turn sleep off when the boot time cannot be read", async () => {
    vi.mocked(system.getBootTime).mockRejectedValue(new Error("sysctl failed"));

    await expect(enable(60)).rejects.toThrow("sysctl failed");
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    expect(storedSession()).toBeNull();
  });

  it("turns sleep back off and rejects when the session cannot be saved", async () => {
    const setItem = vi.spyOn(LocalStorage, "setItem").mockRejectedValueOnce(new Error("disk full"));

    await expect(enable(60)).rejects.toThrow("disk full");
    expect(system.setSleepDisabled).toHaveBeenCalledTimes(2);
    expect(system.setSleepDisabled).toHaveBeenNthCalledWith(1, true);
    expect(system.setSleepDisabled).toHaveBeenNthCalledWith(2, false);
    expect(setItem).toHaveBeenCalledTimes(1);
    setItem.mockRestore();
  });

  it("stores endsAt null for an indefinite session", async () => {
    await enable(null);

    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: null, bootTime: BOOT });
  });

  it("enables indefinitely even when the menu bar cannot launch, since no timer depends on it", async () => {
    raycast.launchCommand.mockRejectedValue(new Error("Menu bar command not enabled"));

    await expect(enable(null)).resolves.toBeUndefined();
    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: null, bootTime: BOOT });
  });

  it("refreshes the menu bar and the status subtitle after enabling indefinitely", async () => {
    await enable(null);

    expect(raycast.launchCommand.mock.calls).toEqual([
      [{ name: "statusmenu", type: "background" }],
      [{ name: "status", type: "background" }],
    ]);
  });

  it("still refuses to enable indefinitely below the battery cutoff when the rule is installed", async () => {
    setBattery({ hasBattery: true, percent: 15, onAC: false });

    await expect(enable(null)).rejects.toThrow("Battery is at 15%, at or below your 20% cutoff");
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
  });

  describe("without the passwordless rule", () => {
    beforeEach(() => {
      vi.mocked(system.isRuleInstalled).mockResolvedValue(false);
    });

    it("enables indefinitely through the Touch ID or password prompt, as Doorstopper always has", async () => {
      await enable(null);

      expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true, { allowPrompt: true }]]);
    });

    it("stores no session, since auto-off could not run without a prompt", async () => {
      await enable(null);

      expect(storedSession()).toBeNull();
    });

    it("clears a session left from before the rule was removed, so its timer never applies", async () => {
      seedSession({ startedAt: NOW - 10 * MINUTE, endsAt: NOW + 20 * MINUTE, bootTime: BOOT });
      raycast.store.set("recheck", "pending");
      raycast.store.set("recent-durations", "[45]");

      await enable(null);

      expect(storedSession()).toBeNull();
      expect(raycast.store.has("recheck")).toBe(false);
      expect(raycast.store.get("recent-durations")).toBe("[45]");
    });

    it("ignores the battery cutoff, which only applies once the rule lets auto-off run", async () => {
      setBattery({ hasBattery: true, percent: 5, onAC: false });

      await enable(null);

      expect(system.setSleepDisabled).toHaveBeenCalledWith(true, { allowPrompt: true });
    });

    it("works without the menu bar", async () => {
      raycast.launchCommand.mockRejectedValue(new Error("Menu bar command not enabled"));

      await expect(enable(null)).resolves.toBeUndefined();
    });

    it("refreshes the menu bar and the status subtitle", async () => {
      await enable(null);

      expect(raycast.launchCommand.mock.calls).toEqual([
        [{ name: "statusmenu", type: "background" }],
        [{ name: "status", type: "background" }],
      ]);
    });

    it("rejects and keeps an existing session when the prompt is cancelled", async () => {
      const cancelled = Object.assign(new Error("Doorstopper was not changed"), {
        name: "AuthenticationCanceledError",
      });
      vi.mocked(system.setSleepDisabled).mockRejectedValue(cancelled);
      const session = { startedAt: NOW - 10 * MINUTE, endsAt: null, bootTime: BOOT };
      seedSession(session);

      await expect(enable(null)).rejects.toBe(cancelled);
      expect(storedSession()).toEqual(session);
      expect(raycast.launchCommand).not.toHaveBeenCalled();
    });
  });

  it("removes older sessions when it saves", async () => {
    seedSession({ startedAt: NOW - 10 * MINUTE, endsAt: null, bootTime: BOOT }, 1);
    seedSession({ startedAt: NOW - 5 * MINUTE, endsAt: null, bootTime: BOOT }, 2);

    await enable(60);

    expect(sessionKeys()).toEqual(["session:3"]);
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
  });

  it("keeps the new session when the clock moved backward since the last Start", async () => {
    // NTP or a manual change can move the clock back while a session is active. The new start time is then earlier
    // than the stored one, so ordering by start time would keep the old session.
    const indefinite = seedSession({ startedAt: NOW, endsAt: null, bootTime: BOOT });
    vi.setSystemTime(NOW - 60 * MINUTE);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await enable(30);

    const startedAt = NOW - 60 * MINUTE;
    const session = { startedAt, endsAt: startedAt + 30 * MINUTE, bootTime: BOOT };
    expect(raycast.store.has(`session:${indefinite}`)).toBe(false);
    expect(storedSession()).toEqual(session);
    expect(sessionKeys().length).toBe(1);
    await expect(getStatus()).resolves.toEqual({ on: true, session, battery: ON_BATTERY_80 });
  });

  it("replaces a session saved under an old timestamp key", async () => {
    // Builds before sequence numbers stored the start time in the key. A new Start must still replace that session.
    raycast.store.set(`session:${NOW}`, JSON.stringify({ startedAt: NOW, endsAt: null, bootTime: BOOT }));

    await enable(60);

    expect(raycast.store.has(`session:${NOW}`)).toBe(false);
    expect(sessionKeys().length).toBe(1);
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
  });

  it("keeps a session with a higher sequence number that an overlapping Start saved", async () => {
    // While this Start writes its key, another Start saves session 99. This Start's number is lower, so 99 must survive.
    const overlapping = { startedAt: NOW - 3 * MINUTE, endsAt: NOW + 57 * MINUTE, bootTime: BOOT };
    const setItem = vi.spyOn(LocalStorage, "setItem").mockImplementationOnce(async (key, value) => {
      seedSession(overlapping, 99);
      raycast.store.set(key, String(value));
    });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await enable(60);

    expect(raycast.store.has("session:99")).toBe(true);
    await expect(getStatus()).resolves.toEqual({ on: true, session: overlapping, battery: ON_BATTERY_80 });
    setItem.mockRestore();
  });

  it.each([20, 5])("refuses to turn on at %i percent on battery with a 20 percent cutoff", async (percent) => {
    setBattery({ hasBattery: true, percent, onAC: false });

    await expect(enable(60)).rejects.toThrow(`Battery is at ${percent}%, at or below your 20% cutoff`);
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    expect(storedSession()).toBeNull();
  });

  it("allows turning on just above the cutoff on battery", async () => {
    setBattery({ hasBattery: true, percent: 21, onAC: false });

    await expect(enable(60)).resolves.toBeUndefined();
    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
  });

  it("allows turning on below the cutoff when plugged into AC power", async () => {
    setBattery({ hasBattery: true, percent: 5, onAC: true });

    await expect(enable(60)).resolves.toBeUndefined();
    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
  });

  it("allows turning on below 20% when the cutoff is Off (0)", async () => {
    raycast.prefs = { ...raycast.prefs, batteryThreshold: "0" };
    setBattery({ hasBattery: true, percent: 5, onAC: false });

    await expect(enable(60)).resolves.toBeUndefined();
    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
  });

  it("allows turning on at 0% when the cutoff is Off (0)", async () => {
    raycast.prefs = { ...raycast.prefs, batteryThreshold: "0" };
    setBattery({ hasBattery: true, percent: 0, onAC: false });

    await expect(enable(60)).resolves.toBeUndefined();
    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
  });

  it("allows turning on a desktop Mac that has no battery", async () => {
    setBattery({ hasBattery: false, percent: null, onAC: true });

    await expect(enable(60)).resolves.toBeUndefined();
    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
  });

  it("replaces the active session and reports the new one from getStatus", async () => {
    const old = seedSession({ startedAt: NOW - 10 * MINUTE, endsAt: null, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await enable(60);

    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    expect(raycast.store.has(`session:${old}`)).toBe(false);
    expect(sessionKeys().length).toBe(1);
    await expect(getStatus()).resolves.toEqual({ on: true, session: fresh, battery: ON_BATTERY_80 });
  });

  it("stores an indefinite session when enable is given 0 minutes", async () => {
    await enable(0);

    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: null, bootTime: BOOT });
  });

  it("keeps the new session when removing an older session fails during enable", async () => {
    const old = seedSession({ startedAt: NOW - 10 * MINUTE, endsAt: null, bootTime: BOOT }, 1);
    const removeItem = vi.spyOn(LocalStorage, "removeItem").mockRejectedValueOnce(new Error("storage busy"));
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(enable(60)).resolves.toBeUndefined();

    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    expect(raycast.store.has(`session:${old}`)).toBe(true);
    expect(storedSession()).toEqual(fresh);
    await expect(getStatus()).resolves.toEqual({ on: true, session: fresh, battery: ON_BATTERY_80 });
    removeItem.mockRestore();
  });

  it("rejects with the menu bar message when the menu bar cannot launch and the undo also fails", async () => {
    raycast.launchCommand.mockRejectedValue(new Error("Menu bar command not enabled"));
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    vi.mocked(system.setSleepDisabled).mockImplementation(async (on) => {
      if (!on) {
        throw new Error("sudo: a password is required");
      }
    });

    await expect(enable(60)).rejects.toThrow("Run Doorstopper Status Menu Bar once and keep it enabled in Raycast");
    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true], [false, { allowPrompt: false }]]);
  });

  it("rejects with the error when turning sleep back on after saving the session fails", async () => {
    // Sleep reads as off after the save, so enable tries to turn it on again, and that attempt fails.
    vi.mocked(system.setSleepDisabled)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("sudo: re-assert failed"));

    await expect(enable(60)).rejects.toThrow("sudo: re-assert failed");
    expect(raycast.launchCommand).not.toHaveBeenCalled();
  });

  it("keeps another Start's session when this Start's menu bar launch fails after that Start saved", async () => {
    let rejectFirstLaunch!: (error: Error) => void;
    raycast.launchCommand.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectFirstLaunch = reject;
        }),
    );

    const first = enable(30);
    // Wait until the first Start is waiting on the menu bar, so the second Start saves while the first is still pending.
    await vi.waitFor(() => expect(raycast.launchCommand).toHaveBeenCalledTimes(1));
    await enable(60);
    rejectFirstLaunch(new Error("Menu bar command not enabled"));

    await expect(first).rejects.toThrow("Run Doorstopper Status Menu Bar once and keep it enabled in Raycast");
    // The fake clock moves while waiting, so check the 60 minute length rather than an exact start time.
    const session = storedSession();
    expect(session?.endsAt).toBe((session?.startedAt ?? 0) + 60 * MINUTE);
    expect(session?.bootTime).toBe(BOOT);
    expect(sessionKeys()).toEqual(["session:2"]);
    const sleepAllowed = vi.mocked(system.setSleepDisabled).mock.calls.filter(([on]) => on === false);
    expect(sleepAllowed).toEqual([]);
  });

  it("does not turn sleep on again when a Turn Off in another command cleared the sessions after the save", async () => {
    let sessionAtCheck: Session | null = null;
    vi.mocked(system.isSleepDisabled).mockImplementationOnce(async () => {
      // The first check after the save is the one in startSession. A Turn Off in another command runs at this point:
      // it allows sleep and clears the sessions.
      sessionAtCheck = storedSession();
      raycast.store.clear();
      return false;
    });

    await enable(60);

    expect(sessionAtCheck).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true]]);
    expect(storedSession()).toBeNull();
  });

  it("allows sleep again when a Turn Off in another command clears the sessions while sleep is turned back on", async () => {
    vi.mocked(system.setSleepDisabled)
      .mockResolvedValueOnce(undefined)
      // Turning sleep back on is the second call. A Turn Off in another command clears the sessions during it.
      .mockImplementationOnce(async () => {
        raycast.store.clear();
      });

    await enable(60);

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true], [true], [false, { allowPrompt: false }]]);
    expect(storedSession()).toBeNull();
  });
});

describe("disable", () => {
  it("turns sleep back on, clears the session, and refreshes the menu bar", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });

    await disable();

    expect(system.setSleepDisabled).toHaveBeenCalledWith(false, { allowPrompt: true });
    expect(storedSession()).toBeNull();
    expect(raycast.launchCommand).toHaveBeenCalledWith({ name: "statusmenu", type: "background" });
  });

  it("removes every stored session and the legacy session key", async () => {
    seedSession({ startedAt: NOW - 5 * MINUTE, endsAt: null, bootTime: BOOT });
    seedSession({ startedAt: NOW + 10 * MINUTE, endsAt: null, bootTime: BOOT });
    raycast.store.set("session", JSON.stringify({ startedAt: NOW - 30 * MINUTE, endsAt: null, bootTime: BOOT }));

    await disable();

    expect([...raycast.store.keys()]).toEqual([]);
  });

  it("passes allowPrompt false through when it is asked not to prompt", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });

    await disable({ allowPrompt: false });

    expect(system.setSleepDisabled).toHaveBeenCalledWith(false, { allowPrompt: false });
    expect(storedSession()).toBeNull();
  });

  it("rejects and keeps the stored session when sleep cannot be turned back on", async () => {
    const session = { startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT };
    seedSession(session);
    vi.mocked(system.setSleepDisabled).mockRejectedValue(new Error("sudo: a password is required"));

    await expect(disable()).rejects.toThrow("sudo: a password is required");
    expect(storedSession()).toEqual(session);
  });

  it("allows sleep again when a Start in another command disabled it after the sessions were cleared", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await disable();

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([
      [false, { allowPrompt: true }],
      [false, { allowPrompt: false }],
    ]);
    expect(storedSession()).toBeNull();
  });

  it("does not allow sleep a second time when sleep already reads as off after the sessions were cleared", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(false);

    await disable();

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[false, { allowPrompt: true }]]);
  });

  it("does not allow sleep a second time when the read that checks for a session fails", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockImplementationOnce(async () => {
      // Sleep reads as on after the sessions were cleared, and the read that checks for a session then fails.
      raycast.failNextAllItems = true;
      return true;
    });

    await disable();

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[false, { allowPrompt: true }]]);
  });

  it("resolves when checking sleep after the sessions were cleared fails, since the Turn Off itself succeeded", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockRejectedValue(new Error("pmset: could not read power settings"));

    await expect(disable()).resolves.toBeUndefined();
    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[false, { allowPrompt: true }]]);
    expect(storedSession()).toBeNull();
  });

  it("does not allow sleep a second time when a Start saved a session before the check", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    vi.mocked(system.isSleepDisabled).mockImplementation(async () => {
      seedSession(fresh);
      return true;
    });

    await disable();

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[false, { allowPrompt: true }]]);
    expect(storedSession()).toEqual(fresh);
  });

  it("resolves when allowing sleep the second time fails, since the Turn Off itself succeeded", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    vi.mocked(system.setSleepDisabled).mockImplementation(async (_on, options) => {
      if (options?.allowPrompt === false) {
        throw new Error("sudo: a password is required");
      }
    });

    await expect(disable()).resolves.toBeUndefined();
    expect(storedSession()).toBeNull();
  });
});

describe("menu bar refresh failures", () => {
  it("enable undoes the start when the menu bar command cannot be launched", async () => {
    raycast.launchCommand.mockRejectedValue(new Error("Menu bar command not enabled"));
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(enable(60)).rejects.toThrow(
      "Run Doorstopper Status Menu Bar once and keep it enabled in Raycast. It disables Doorstopper when the timer ends, the battery is low, or after a restart",
    );
    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true], [false, { allowPrompt: false }]]);
    expect(storedSession()).toBeNull();
  });

  it("allows sleep when the read after the undo fails, since the menu bar cannot run to turn it off", async () => {
    raycast.launchCommand.mockImplementationOnce(async () => {
      // The menu bar cannot launch, and the read that checks for other sessions after the undo fails.
      raycast.failNextAllItems = true;
      throw new Error("Menu bar command not enabled");
    });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(enable(60)).rejects.toThrow("Run Doorstopper Status Menu Bar once and keep it enabled in Raycast");
    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true], [false, { allowPrompt: false }]]);
    expect(storedSession()).toBeNull();
  });

  it("enable launches the menu bar command only after sleep is off and the session is saved", async () => {
    let sessionAtLaunch: Session | null = null;
    raycast.launchCommand.mockImplementation(async () => {
      sessionAtLaunch = storedSession();
    });

    await enable(60);

    const sleepOn = vi.mocked(system.setSleepDisabled).mock.calls.findIndex(([on]) => on === true);
    const sleepOrder = vi.mocked(system.setSleepDisabled).mock.invocationCallOrder[sleepOn];
    const launchOrder = raycast.launchCommand.mock.invocationCallOrder[0];
    expect(sleepOrder).toBeLessThan(launchOrder);
    expect(sessionAtLaunch).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
  });

  it("enable launches the menu bar command exactly once on success, then refreshes the status subtitle", async () => {
    await enable(60);

    expect(raycast.launchCommand.mock.calls).toEqual([
      [{ name: "statusmenu", type: "background" }],
      [{ name: "status", type: "background" }],
    ]);
  });

  it("enable keeps the timer when only the status command cannot be launched", async () => {
    raycast.launchCommand.mockImplementation(async ({ name }: { name: string }) => {
      if (name === "status") {
        throw new Error("Status command not enabled");
      }
    });

    await expect(enable(60)).resolves.toBeUndefined();
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
    expect(system.setSleepDisabled).not.toHaveBeenCalledWith(false, expect.anything());
  });

  it("disable still succeeds when the menu bar command cannot be launched", async () => {
    raycast.launchCommand.mockRejectedValue(new Error("Menu bar command not enabled"));
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });

    await expect(disable()).resolves.toBeUndefined();
    expect(storedSession()).toBeNull();
  });
});

describe("getStatus", () => {
  it("returns the stored session while sleep is disabled", async () => {
    const session = { startedAt: NOW - MINUTE, endsAt: NOW + 59 * MINUTE, bootTime: BOOT };
    seedSession(session);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(getStatus()).resolves.toEqual({ on: true, session, battery: ON_BATTERY_80 });
  });

  it("clears a stale session when sleep is no longer disabled", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(false);

    await expect(getStatus()).resolves.toEqual({ on: false, session: null, battery: ON_BATTERY_80 });
    expect(storedSession()).toBeNull();
  });

  it("keeps a session that enable saves between the sleep check and the session read", async () => {
    // Simulates enable() running concurrently: it turns sleep on before saving, so getStatus must read
    // the session first. Reading pmset first would see sleep off, then find the new session and delete it.
    const fresh = { startedAt: NOW, endsAt: null, bootTime: BOOT };
    vi.mocked(system.isSleepDisabled).mockImplementation(async () => {
      seedSession(fresh);
      return false;
    });

    await getStatus();

    expect(storedSession()).toEqual(fresh);
  });

  it("does not delete a session that another enable wrote while the check ran", async () => {
    // The check sees a stale session with sleep off. Meanwhile enable turns sleep on and saves a new session.
    seedSession({ startedAt: NOW - 5 * MINUTE, endsAt: null, bootTime: BOOT });
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    vi.mocked(system.isSleepDisabled)
      .mockImplementationOnce(async () => {
        seedSession(fresh);
        return false;
      })
      .mockResolvedValue(true);

    await expect(getStatus()).resolves.toEqual({ on: true, session: fresh, battery: ON_BATTERY_80 });
    expect(storedSession()).toEqual(fresh);
  });

  it("keeps a session that enable saves just before the stale one is cleared", async () => {
    // Bugbot race: a new session is saved between the stale-session check and the delete.
    // The clear must remove only the stale session's own key, so the new one survives.
    const stale = { startedAt: NOW - 5 * MINUTE, endsAt: null, bootTime: BOOT };
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    const staleSeq = seedSession(stale);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(false);
    let freshSeq = 0;
    const removeItem = vi.spyOn(LocalStorage, "removeItem").mockImplementationOnce(async (key) => {
      freshSeq = seedSession(fresh);
      raycast.store.delete(key);
    });

    await getStatus();

    expect(removeItem).toHaveBeenCalledWith(`session:${staleSeq}`);
    expect([...raycast.store.keys()]).toEqual([`session:${freshSeq}`]);
    removeItem.mockRestore();
  });

  it("runs a status check and an enable one after the other", async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(system.isSleepDisabled)
      .mockImplementationOnce(async () => {
        order.push("status reads sleep");
        await gate;
        return false;
      })
      .mockResolvedValue(true);
    vi.mocked(system.isRuleInstalled).mockImplementation(async () => {
      order.push("enable checks rule");
      return true;
    });

    const status = getStatus();
    const turnOn = enable(60);
    release();
    await Promise.all([status, turnOn]);

    expect(order).toEqual(["status reads sleep", "enable checks rule"]);
  });

  it("runs a disable that starts during an enable only after the enable has saved its session", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    // Holds enable partway through its start, before it turns sleep on or saves the session.
    vi.mocked(system.getBootTime).mockImplementationOnce(async () => {
      await gate;
      return BOOT;
    });

    const turnOn = enable(60);
    const turnOff = disable();
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    release();
    await Promise.all([turnOn, turnOff]);

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[true], [true], [false, { allowPrompt: true }]]);
    expect(storedSession()).toBeNull();
  });

  it("returns the battery reading from getBattery", async () => {
    const reading: Battery = { hasBattery: true, percent: 42, onAC: true };
    setBattery(reading);

    await expect(getStatus()).resolves.toEqual({ on: false, session: null, battery: reading });
  });
});

describe("enforce", () => {
  it("returns null and does nothing when Doorstopper is disabled", async () => {
    vi.mocked(system.isSleepDisabled).mockResolvedValue(false);

    await expect(enforce()).resolves.toBeNull();
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    expect(raycast.launchCommand).not.toHaveBeenCalled();
  });

  it("returns null and does nothing when sleep was disabled outside the extension (no session)", async () => {
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    setBattery({ hasBattery: true, percent: 5, onAC: false });

    await expect(enforce()).resolves.toBeNull();
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
  });

  it("returns timer and turns sleep back on once endsAt has passed", async () => {
    seedSession({ startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(enforce()).resolves.toBe("timer");
    expect(system.setSleepDisabled).toHaveBeenCalledWith(false, { allowPrompt: false });
    expect(storedSession()).toBeNull();
  });

  it("returns restart and turns sleep back on when the boot time changed", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: NOW + 59 * MINUTE, bootTime: BOOT - 86_400 });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(enforce()).resolves.toBe("restart");
    expect(system.setSleepDisabled).toHaveBeenCalledWith(false, { allowPrompt: false });
    expect(storedSession()).toBeNull();
  });

  it("returns battery and turns sleep back on when below the cutoff on battery power", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    setBattery({ hasBattery: true, percent: 15, onAC: false });

    await expect(enforce()).resolves.toBe("battery");
    expect(system.setSleepDisabled).toHaveBeenCalledWith(false, { allowPrompt: false });
    expect(storedSession()).toBeNull();
  });

  it("returns null and keeps sleep disabled when no rule applies", async () => {
    const session = { startedAt: NOW - MINUTE, endsAt: NOW + 59 * MINUTE, bootTime: BOOT };
    seedSession(session);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(enforce()).resolves.toBeNull();
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    expect(storedSession()).toEqual(session);
  });

  it("refreshes the menu bar and the status subtitle when auto-off turns sleep back on", async () => {
    seedSession({ startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(enforce()).resolves.toBe("timer");
    expect(raycast.launchCommand.mock.calls).toEqual([
      [{ name: "statusmenu", type: "background" }],
      [{ name: "status", type: "background" }],
    ]);
  });

  it("does not refresh the menu bar when no rule applies", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: NOW + 59 * MINUTE, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(enforce()).resolves.toBeNull();
    expect(raycast.launchCommand).not.toHaveBeenCalled();
  });

  it("rejects and keeps the session when turning sleep back on fails during auto-off", async () => {
    const expired = { startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT };
    seedSession(expired);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    vi.mocked(system.setSleepDisabled).mockRejectedValue(new Error("sudo: a password is required"));

    await expect(enforce()).rejects.toThrow("sudo: a password is required");
    expect(storedSession()).toEqual(expired);
    expect(raycast.launchCommand).not.toHaveBeenCalled();
  });

  it("never auto-disables on battery when the cutoff is Off (0), even at 1%", async () => {
    raycast.prefs = { ...raycast.prefs, batteryThreshold: "0" };
    const session = { startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT };
    seedSession(session);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    setBattery({ hasBattery: true, percent: 1, onAC: false });

    await expect(enforce()).resolves.toBeNull();
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    expect(storedSession()).toEqual(session);
  });

  it("never times out an indefinite session, however much time passes", async () => {
    const session = { startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT };
    seedSession(session);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    vi.setSystemTime(NOW + 365 * 24 * 60 * MINUTE);

    await expect(enforce()).resolves.toBeNull();
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    expect(storedSession()).toEqual(session);
  });
});

describe("enforce race", () => {
  it("keeps sleep on when a new session starts after the check", async () => {
    seedSession({ startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    vi.mocked(system.getBootTime).mockImplementation(async () => {
      seedSession(fresh);
      return BOOT;
    });

    await expect(enforce()).resolves.toBeNull();
    expect(system.setSleepDisabled).toHaveBeenNthCalledWith(1, false, { allowPrompt: false });
    expect(system.setSleepDisabled).toHaveBeenLastCalledWith(true);
    expect(storedSession()).toEqual(fresh);
  });

  it("turns sleep back on and keeps the new session when a Start lands while auto-off runs", async () => {
    seedSession({ startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    vi.mocked(system.setSleepDisabled).mockImplementation(async (on) => {
      if (on === false) {
        seedSession(fresh);
      }
    });

    await expect(enforce()).resolves.toBeNull();
    expect(system.setSleepDisabled).toHaveBeenCalledTimes(2);
    expect(system.setSleepDisabled).toHaveBeenLastCalledWith(true);
    expect(storedSession()).toEqual(fresh);
    expect(raycast.launchCommand).not.toHaveBeenCalled();
  });

  it("keeps a session that a Start saves while auto-off clears the expired one", async () => {
    // The expired session is cleared after the check, so a Start that saves in between must survive the clear.
    const expired = { startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT };
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    const expiredSeq = seedSession(expired);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    let freshSeq = 0;
    const removeItem = vi.spyOn(LocalStorage, "removeItem").mockImplementationOnce(async (key) => {
      freshSeq = seedSession(fresh);
      raycast.store.delete(key);
    });

    await expect(enforce()).resolves.toBe("timer");

    expect(removeItem).toHaveBeenCalledWith(`session:${expiredSeq}`);
    expect([...raycast.store.keys()]).toEqual([`session:${freshSeq}`]);
    removeItem.mockRestore();
  });

  it("keeps sleep disabled when the read that checks the newer session fails after auto-off", async () => {
    seedSession({ startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    vi.mocked(system.setSleepDisabled)
      .mockImplementationOnce(async () => {
        // A Start saved a newer session while auto-off turned sleep off.
        seedSession(fresh);
      })
      .mockImplementationOnce(async () => {
        // Sleep is turned back on, and the read that checks the stored session then fails.
        raycast.failNextAllItems = true;
      });

    await expect(enforce()).resolves.toBeNull();

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[false, { allowPrompt: false }], [true]]);
    expect(storedSession()).toEqual(fresh);
  });

  it("keeps sleep on and the expired session stored when the read after allowing sleep fails, then turns off on the next check", async () => {
    const expired = { startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT };
    seedSession(expired);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    vi.mocked(system.setSleepDisabled).mockImplementationOnce(async () => {
      // Auto-off allows sleep, and the read that checks for a newer session then fails.
      raycast.failNextAllItems = true;
    });

    await expect(enforce()).resolves.toBeNull();

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[false, { allowPrompt: false }], [true]]);
    expect(storedSession()).toEqual(expired);
    expect(raycast.launchCommand).not.toHaveBeenCalled();

    // The next check reads storage fine, so the still-expired session is turned off.
    await expect(enforce()).resolves.toBe("timer");

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([
      [false, { allowPrompt: false }],
      [true],
      [false, { allowPrompt: false }],
    ]);
    expect(storedSession()).toBeNull();
    expect(raycast.launchCommand).toHaveBeenCalledTimes(2);
  });

  it("turns sleep back on after auto-off when a newer session was saved and is still stored", async () => {
    seedSession({ startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    vi.mocked(system.setSleepDisabled).mockImplementationOnce(async () => {
      // A Start saved a newer session while auto-off turned sleep off.
      seedSession(fresh);
    });

    await expect(enforce()).resolves.toBeNull();

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([[false, { allowPrompt: false }], [true]]);
    expect(storedSession()).toEqual(fresh);
  });

  it("allows sleep again when the newer session is cleared while sleep is turned back on", async () => {
    seedSession({ startedAt: NOW - 61 * MINUTE, endsAt: NOW - MINUTE, bootTime: BOOT });
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    const fresh = { startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT };
    vi.mocked(system.setSleepDisabled)
      .mockImplementationOnce(async () => {
        // A Start saved a newer session while auto-off turned sleep off.
        seedSession(fresh);
      })
      .mockImplementationOnce(async () => {
        // A Turn Off in another command clears the sessions while sleep is turned back on.
        raycast.store.clear();
      });

    await expect(enforce()).resolves.toBeNull();

    expect(vi.mocked(system.setSleepDisabled).mock.calls).toEqual([
      [false, { allowPrompt: false }],
      [true],
      [false, { allowPrompt: false }],
    ]);
    expect(storedSession()).toBeNull();
  });
});

describe("durationLabel", () => {
  it.each<[number | null, string]>([
    [null, "Indefinitely"],
    [1, "1 minute"],
    [30, "30 minutes"],
    [60, "1 hour"],
    [61, "1 hour 1 minute"],
    [90, "1 hour 30 minutes"],
    [150, "2 hours 30 minutes"],
    [120, "2 hours"],
    [240, "4 hours"],
  ])("labels %s as %j", (minutes, label) => {
    expect(durationLabel(minutes)).toBe(label);
  });
});

describe("getDefaultMinutes", () => {
  it("returns null when the default duration is Indefinitely (0)", () => {
    raycast.prefs = { ...raycast.prefs, defaultDuration: "0" };

    expect(getDefaultMinutes()).toBeNull();
  });

  it("returns the preference as minutes", () => {
    raycast.prefs = { ...raycast.prefs, defaultDuration: "120" };

    expect(getDefaultMinutes()).toBe(120);
  });

  it.each(["", "abc"])("returns null when the default duration is %j", (value) => {
    raycast.prefs = { ...raycast.prefs, defaultDuration: value };

    expect(getDefaultMinutes()).toBeNull();
  });
});

describe("low battery cutoff preference", () => {
  it.each(["", "abc"])("treats the cutoff %j as Off, so enable is allowed at 5 percent on battery", async (value) => {
    raycast.prefs = { ...raycast.prefs, batteryThreshold: value };
    setBattery({ hasBattery: true, percent: 5, onAC: false });

    await expect(enable(60)).resolves.toBeUndefined();
    expect(system.setSleepDisabled).toHaveBeenCalledWith(true);
  });
});

describe("stored session entries", () => {
  it("ignores LocalStorage keys that are not sessions and keeps them", async () => {
    raycast.store.set("preferences-cache", "1");
    raycast.store.set("session-notes", "keep me");
    const session = { startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT };
    seedSession(session);
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(getStatus()).resolves.toEqual({ on: true, session, battery: ON_BATTERY_80 });
    expect(raycast.store.get("preferences-cache")).toBe("1");
    expect(raycast.store.get("session-notes")).toBe("keep me");
  });

  it("keeps non-session keys when Doorstopper is disabled", async () => {
    raycast.store.set("session-notes", "keep me");
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });

    await disable();

    expect(storedSession()).toBeNull();
    expect(raycast.store.get("session-notes")).toBe("keep me");
  });

  it.each(["session:abc", "session:0", "session:-3"])("ignores the key %s when reading the session", async (key) => {
    raycast.store.set(key, JSON.stringify({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT }));
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(getStatus()).resolves.toEqual({ on: true, session: null, battery: ON_BATTERY_80 });
  });

  it("ignores a session value that is not valid JSON", async () => {
    raycast.store.set("session:1", "{not json");
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(getStatus()).resolves.toEqual({ on: true, session: null, battery: ON_BATTERY_80 });
  });

  it("ignores a session value that has no startedAt time", async () => {
    raycast.store.set("session:1", JSON.stringify({ endsAt: null, bootTime: BOOT }));
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(getStatus()).resolves.toEqual({ on: true, session: null, battery: ON_BATTERY_80 });
  });

  it("falls back to the newest readable session when the newest value is corrupt", async () => {
    const session = { startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT };
    seedSession(session, 1);
    raycast.store.set("session:2", "corrupt");
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(getStatus()).resolves.toEqual({ on: true, session, battery: ON_BATTERY_80 });
  });

  it("treats the session as absent when LocalStorage cannot be read", async () => {
    const allItems = vi.spyOn(LocalStorage, "allItems").mockRejectedValue(new Error("storage unavailable"));
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);

    await expect(getStatus()).resolves.toEqual({ on: true, session: null, battery: ON_BATTERY_80 });
    allItems.mockRestore();
  });
});

describe("review fixes", () => {
  it("never reuses a session number after its session was cleared, so an older check cannot delete a new timer", async () => {
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    await enable(30);
    expect(sessionKeys()).toEqual(["session:1"]);
    await disable();

    await enable(60);

    expect(sessionKeys()).toEqual(["session:2"]);
  });

  it("undoes a Start when checking sleep after the save fails, so sleep is not left disabled", async () => {
    vi.mocked(system.isSleepDisabled).mockRejectedValueOnce(new Error("pmset failed"));

    await expect(enable(30)).rejects.toThrow("pmset failed");

    expect(sessionKeys()).toEqual([]);
    expect(system.setSleepDisabled).toHaveBeenLastCalledWith(false, { allowPrompt: false });
  });

  it("still reports the sleep state when the battery cannot be read", async () => {
    vi.mocked(system.isSleepDisabled).mockResolvedValue(true);
    vi.mocked(system.getBattery).mockRejectedValue(new Error("pmset failed"));

    await expect(getStatus()).resolves.toEqual({
      on: true,
      session: null,
      battery: undefined,
    });
  });
});
