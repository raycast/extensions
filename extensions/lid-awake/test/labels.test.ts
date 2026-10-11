import { describe, expect, it, vi } from "vitest";
import {
  autoOffMessage,
  batteryTitle,
  isUserCancelled,
  menuBarTitles,
  presetSubtitle,
  startAccessoryTitle,
  turnOnMessage,
} from "../src/lib/labels";
import type { Battery, Session } from "../src/lib/parse";
import type { Status } from "../src/lib/session";

// labels.ts imports session.ts, which imports @raycast/api at load time. Mock it the same way session.test.ts does.
vi.mock("@raycast/api", () => ({
  getPreferenceValues: () => ({}),
  launchCommand: vi.fn(),
  LaunchType: { Background: "background", UserInitiated: "userInitiated" },
  LocalStorage: {
    getItem: async () => undefined,
    allItems: async () => ({}),
    setItem: async () => undefined,
    removeItem: async () => undefined,
  },
}));

const NOW = new Date("2024-10-11T09:00:00Z").getTime();
const MINUTE = 60_000;
const BATTERY_ON_BATTERY: Battery = { hasBattery: true, percent: 55, onAC: false };

function session(endsAt: number | null): Session {
  return { startedAt: NOW, endsAt, bootTime: 1728633600 };
}

function status(overrides: Partial<Status> = {}): Status {
  return { on: false, session: null, battery: BATTERY_ON_BATTERY, ...overrides };
}

describe("autoOffMessage", () => {
  it("says the Mac restarted for a restart", () => {
    expect(autoOffMessage("restart", "20")).toBe("Lid Awake turned off: Mac restarted");
  });

  it("says the timer ended for a timer", () => {
    expect(autoOffMessage("timer", "20")).toBe("Lid Awake turned off: timer ended");
  });

  it("includes the battery threshold for a battery cutoff", () => {
    expect(autoOffMessage("battery", "20")).toBe("Lid Awake turned off: battery below 20%");
    expect(autoOffMessage("battery", "5")).toBe("Lid Awake turned off: battery below 5%");
  });

  it("ignores the threshold for restart and timer", () => {
    expect(autoOffMessage("restart", "5")).toBe("Lid Awake turned off: Mac restarted");
    expect(autoOffMessage("timer", "5")).toBe("Lid Awake turned off: timer ended");
  });
});

describe("turnOnMessage", () => {
  it("says on until you turn it off for an indefinite session", () => {
    expect(turnOnMessage(null)).toBe("Lid Awake on until you turn it off");
  });

  it("uses minutes below an hour", () => {
    expect(turnOnMessage(30)).toBe("Lid Awake on for 30 minutes");
  });

  it("uses the singular for one hour", () => {
    expect(turnOnMessage(60)).toBe("Lid Awake on for 1 hour");
  });

  it("uses the plural for longer durations", () => {
    expect(turnOnMessage(120)).toBe("Lid Awake on for 2 hours");
    expect(turnOnMessage(240)).toBe("Lid Awake on for 4 hours");
  });
});

describe("menuBarTitles", () => {
  it("shows Off with no title when the status has not loaded", () => {
    expect(menuBarTitles(undefined, NOW)).toEqual({ statusTitle: "Off", title: undefined });
  });

  it("shows Off with no title when sleep is not disabled", () => {
    expect(menuBarTitles(status({ on: false }), NOW)).toEqual({ statusTitle: "Off", title: undefined });
  });

  it("ignores a stored session when Lid Awake is off", () => {
    const result = menuBarTitles(status({ on: false, session: session(NOW + 30 * MINUTE) }), NOW);
    expect(result).toEqual({ statusTitle: "Off", title: undefined });
  });

  it("shows the remaining minutes for a timed session", () => {
    expect(menuBarTitles(status({ on: true, session: session(NOW + 30 * MINUTE) }), NOW)).toEqual({
      statusTitle: "On, 30m left",
      title: "30m",
    });
  });

  it("shows hours and minutes for a timed session over an hour", () => {
    expect(menuBarTitles(status({ on: true, session: session(NOW + 90 * MINUTE) }), NOW)).toEqual({
      statusTitle: "On, 1h 30m left",
      title: "1h 30m",
    });
  });

  it("shows under a minute as <1m", () => {
    expect(menuBarTitles(status({ on: true, session: session(NOW + 30_000) }), NOW)).toEqual({
      statusTitle: "On, <1m left",
      title: "<1m",
    });
  });

  it("shows <1m for a session whose timer has already passed", () => {
    expect(menuBarTitles(status({ on: true, session: session(NOW - 5 * MINUTE) }), NOW)).toEqual({
      statusTitle: "On, <1m left",
      title: "<1m",
    });
  });

  it("shows the infinity sign for an indefinite session", () => {
    expect(menuBarTitles(status({ on: true, session: session(null) }), NOW)).toEqual({
      statusTitle: "On until you turn it off",
      title: "∞",
    });
  });

  it("shows the infinity sign when sleep was turned on outside the extension", () => {
    expect(menuBarTitles(status({ on: true, session: null }), NOW)).toEqual({
      statusTitle: "On until you turn it off",
      title: "∞",
    });
  });
});

describe("batteryTitle", () => {
  it("says the battery status is unknown before it loads", () => {
    expect(batteryTitle(undefined)).toBe("Battery status unknown");
  });

  it("says there is no battery on a desktop Mac", () => {
    expect(batteryTitle({ hasBattery: false, percent: null, onAC: true })).toBe("No battery (desktop Mac)");
  });

  it("shows the percent on AC power", () => {
    expect(batteryTitle({ hasBattery: true, percent: 80, onAC: true })).toBe("Battery 80%, on AC power");
  });

  it("shows the percent on battery power", () => {
    expect(batteryTitle({ hasBattery: true, percent: 55, onAC: false })).toBe("Battery 55%, on battery power");
  });

  it("shows a question mark when the percent is unknown on battery power", () => {
    expect(batteryTitle({ hasBattery: true, percent: null, onAC: false })).toBe("Battery ?%, on battery power");
  });

  it("shows a question mark when the percent is unknown on AC power", () => {
    expect(batteryTitle({ hasBattery: true, percent: null, onAC: true })).toBe("Battery ?%, on AC power");
  });
});

describe("startAccessoryTitle", () => {
  it("shows Off when the status has not loaded", () => {
    expect(startAccessoryTitle(undefined, NOW)).toBe("Off");
  });

  it("shows Off when sleep is not disabled", () => {
    expect(startAccessoryTitle(status({ on: false }), NOW)).toBe("Off");
  });

  it("shows the time left for a timed session", () => {
    expect(startAccessoryTitle(status({ on: true, session: session(NOW + 2 * 60 * MINUTE) }), NOW)).toBe(
      "On, 2h 00m left",
    );
  });

  it("shows until you turn it off for an indefinite session", () => {
    expect(startAccessoryTitle(status({ on: true, session: session(null) }), NOW)).toBe("On until you turn it off");
  });

  it("shows until you turn it off when sleep was turned on outside the extension", () => {
    expect(startAccessoryTitle(status({ on: true, session: null }), NOW)).toBe("On until you turn it off");
  });
});

describe("presetSubtitle", () => {
  it("says until you turn it off for an indefinite preset", () => {
    expect(presetSubtitle(null, NOW)).toBe("Until you turn it off");
  });

  it("shows the local time the preset ends", () => {
    // Local time, so the expected hour does not depend on the machine's time zone.
    const localNow = new Date(2024, 0, 1, 9, 0).getTime();
    const subtitle = presetSubtitle(60, localNow);
    const expectedTime = new Date(localNow + 60 * MINUTE).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });

    expect(subtitle.startsWith("Until ")).toBe(true);
    expect(subtitle).toBe(`Until ${expectedTime}`);
  });
});

describe("isUserCancelled", () => {
  it("is true for an error with the -128 user-cancelled code", () => {
    expect(isUserCancelled(new Error("execution error: User canceled. (-128)"))).toBe(true);
  });

  it("is true for an error with the User canceled text", () => {
    expect(isUserCancelled(new Error("User canceled."))).toBe(true);
  });

  it("is true for a non-Error value with the cancel text", () => {
    expect(isUserCancelled("execution error: User canceled. (-128)")).toBe(true);
  });

  it("is false for an unrelated error", () => {
    expect(isUserCancelled(new Error("pmset failed with exit code 1"))).toBe(false);
  });

  it("is false for a non-Error value that is unrelated", () => {
    expect(isUserCancelled("something else")).toBe(false);
  });
});
