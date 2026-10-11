import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import * as system from "../src/lib/system";
import { disable, durationLabel, enable, enforce, getDefaultMinutes, getStatus } from "../src/lib/session";
import { LocalStorage } from "@raycast/api";
import type { Battery, Session } from "../src/lib/parse";

const raycast = vi.hoisted(() => ({
  store: new Map<string, string>(),
  prefs: { batteryThreshold: "20", defaultDuration: "60" } as Record<string, string>,
  launchCommand: vi.fn(),
}));

vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => raycast.prefs,
  launchCommand: raycast.launchCommand,
  LaunchType: { Background: "background", UserInitiated: "userInitiated" },
  LocalStorage: {
    getItem: async (key: string) => raycast.store.get(key),
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

function storedSession(): Session | null {
  const raw = raycast.store.get("session");
  return raw ? (JSON.parse(raw) as Session) : null;
}

function seedSession(session: Session): void {
  raycast.store.set("session", JSON.stringify(session));
}

function setBattery(battery: Battery): void {
  vi.mocked(system.getBattery).mockResolvedValue(battery);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);

  vi.resetAllMocks();
  raycast.store.clear();
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
    expect(raycast.launchCommand).toHaveBeenCalledWith({ name: "menu-bar", type: "background" });
  });

  it("refuses to turn on when the passwordless rule is not installed, without touching sleep", async () => {
    vi.mocked(system.isRuleInstalled).mockResolvedValue(false);

    await expect(enable(60)).rejects.toThrow(
      "Run Set up Lid Awake first, so Lid Awake can turn itself off while the lid is closed",
    );
    expect(system.setSleepDisabled).not.toHaveBeenCalled();
    expect(storedSession()).toBeNull();
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

  it.each([20, 5])("refuses to turn on at %i percent on battery with a 20 percent cutoff", async (percent) => {
    setBattery({ hasBattery: true, percent, onAC: false });

    await expect(enable(60)).rejects.toThrow(`Battery is at ${percent}%, below your 20% cutoff`);
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
});

describe("disable", () => {
  it("turns sleep back on, clears the session, and refreshes the menu bar", async () => {
    seedSession({ startedAt: NOW - MINUTE, endsAt: null, bootTime: BOOT });

    await disable();

    expect(system.setSleepDisabled).toHaveBeenCalledWith(false, { allowPrompt: true });
    expect(storedSession()).toBeNull();
    expect(raycast.launchCommand).toHaveBeenCalledWith({ name: "menu-bar", type: "background" });
  });
});

describe("menu bar refresh failures", () => {
  it("enable still succeeds when the menu bar command cannot be launched", async () => {
    raycast.launchCommand.mockRejectedValue(new Error("Menu bar command not enabled"));

    await expect(enable(60)).resolves.toBeUndefined();
    expect(storedSession()).toEqual({ startedAt: NOW, endsAt: NOW + 60 * MINUTE, bootTime: BOOT });
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

  it("runs a status check and an enable one after the other", async () => {
    const order: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vi.mocked(system.isSleepDisabled).mockImplementation(async () => {
      order.push("status reads sleep");
      await gate;
      return false;
    });
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
});

describe("enforce", () => {
  it("returns null and does nothing when Lid Awake is off", async () => {
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
});

describe("durationLabel", () => {
  it.each<[number | null, string]>([
    [null, "Indefinitely"],
    [30, "30 minutes"],
    [60, "1 hour"],
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
});
