import { describe, expect, it } from "vitest";
import {
  formatRemaining,
  parseBattery,
  parseBootTime,
  parseSleepDisabled,
  shouldAutoDisable,
  type Battery,
  type Session,
} from "../src/lib/parse";

const ON_BATTERY_87 =
  "Now drawing from 'Battery Power'\n -InternalBattery-0 (id=4653155)\t87%; discharging; 4:12 remaining present: true\n";
const ON_AC_100 =
  "Now drawing from 'AC Power'\n -InternalBattery-0 (id=4653155)\t100%; charged; 0:00 remaining present: true\n";
const DESKTOP = "Now drawing from 'AC Power'\n";

const BATTERY_OK: Battery = { hasBattery: true, percent: 80, onAC: false };
const BOOT = 1728633600;

describe("parseSleepDisabled", () => {
  it("returns true when SleepDisabled is 1", () => {
    const out = "System-wide power settings:\n SleepDisabled\t\t1\nCurrently in use:\n standby 1\n";
    expect(parseSleepDisabled(out)).toBe(true);
  });

  it("returns false when SleepDisabled is 0", () => {
    const out = "System-wide power settings:\n SleepDisabled\t\t0\nCurrently in use:\n standby 1\n";
    expect(parseSleepDisabled(out)).toBe(false);
  });

  it("returns false when the SleepDisabled line is missing", () => {
    expect(parseSleepDisabled("System-wide power settings:\n sleep 1\n")).toBe(false);
  });
});

describe("parseBattery", () => {
  it("reads percent and battery power on battery", () => {
    expect(parseBattery(ON_BATTERY_87)).toEqual({ hasBattery: true, percent: 87, onAC: false });
  });

  it("reads percent and AC power when plugged in", () => {
    expect(parseBattery(ON_AC_100)).toEqual({ hasBattery: true, percent: 100, onAC: true });
  });

  it("reports no battery on a desktop Mac", () => {
    expect(parseBattery(DESKTOP)).toEqual({ hasBattery: false, percent: null, onAC: true });
  });

  it("parses a single-digit percentage", () => {
    const out =
      "Now drawing from 'Battery Power'\n -InternalBattery-0 (id=4653155)\t5%; discharging; 0:20 remaining present: true\n";
    expect(parseBattery(out)).toEqual({ hasBattery: true, percent: 5, onAC: false });
  });
});

describe("parseBootTime", () => {
  it("extracts the seconds value from sysctl kern.boottime", () => {
    expect(parseBootTime("{ sec = 1728633600, usec = 123456 } Fri Oct 11 09:00:00 2024\n")).toBe(1728633600);
  });

  it("returns null for unexpected output", () => {
    expect(parseBootTime("not a boot time")).toBeNull();
  });
});

describe("formatRemaining", () => {
  it("shows <1m for anything under a minute", () => {
    expect(formatRemaining(0)).toBe("<1m");
    expect(formatRemaining(59_999)).toBe("<1m");
  });

  it("shows whole minutes from one minute up", () => {
    expect(formatRemaining(60_000)).toBe("1m");
    expect(formatRemaining(42 * 60_000)).toBe("42m");
  });

  it("shows hours and zero-padded minutes", () => {
    expect(formatRemaining(65 * 60_000)).toBe("1h 05m");
    expect(formatRemaining(4 * 60 * 60_000)).toBe("4h 00m");
  });
});

describe("shouldAutoDisable", () => {
  const base = {
    now: BOOT + 1000,
    currentBootTime: BOOT,
    battery: BATTERY_OK,
    thresholdPercent: 20,
  };
  const session = (overrides: Partial<Session> = {}): Session => ({
    startedAt: BOOT,
    endsAt: null,
    bootTime: BOOT,
    ...overrides,
  });

  describe("restart", () => {
    it("returns restart when the boot time changed", () => {
      const result = shouldAutoDisable({
        ...base,
        session: session({ bootTime: BOOT }),
        currentBootTime: BOOT + 3600,
      });
      expect(result).toBe("restart");
    });

    it("does not return restart when the session boot time is null", () => {
      expect(shouldAutoDisable({ ...base, session: session({ bootTime: null }), currentBootTime: BOOT })).toBeNull();
    });

    it("does not return restart when the current boot time is null", () => {
      expect(shouldAutoDisable({ ...base, session: session(), currentBootTime: null })).toBeNull();
    });
  });

  describe("timer", () => {
    it("returns timer when now equals endsAt", () => {
      const endsAt = base.now;
      expect(shouldAutoDisable({ ...base, session: session({ endsAt }) })).toBe("timer");
    });

    it("returns timer when now is past endsAt", () => {
      expect(shouldAutoDisable({ ...base, session: session({ endsAt: base.now - 1 }) })).toBe("timer");
    });

    it("does not return timer one millisecond before endsAt", () => {
      expect(shouldAutoDisable({ ...base, session: session({ endsAt: base.now + 1 }) })).toBeNull();
    });

    it("never times out an indefinite session (endsAt null)", () => {
      const farFuture = base.now + 365 * 24 * 60 * 60_000;
      expect(shouldAutoDisable({ ...base, now: farFuture, session: session({ endsAt: null }) })).toBeNull();
    });
  });

  describe("battery", () => {
    const onBattery = (percent: number): Battery => ({ hasBattery: true, percent, onAC: false });

    it("returns battery when the charge is below the threshold", () => {
      expect(shouldAutoDisable({ ...base, session: session(), battery: onBattery(19) })).toBe("battery");
    });

    it("returns battery when the charge equals the threshold", () => {
      expect(shouldAutoDisable({ ...base, session: session(), battery: onBattery(20) })).toBe("battery");
    });

    it("does not return battery when the charge is above the threshold", () => {
      expect(shouldAutoDisable({ ...base, session: session(), battery: onBattery(21) })).toBeNull();
    });

    it("does not return battery when plugged into AC power", () => {
      const battery: Battery = { hasBattery: true, percent: 10, onAC: true };
      expect(shouldAutoDisable({ ...base, session: session(), battery })).toBeNull();
    });

    it("does not return battery when the cutoff is 0 (Off)", () => {
      expect(shouldAutoDisable({ ...base, session: session(), battery: onBattery(5), thresholdPercent: 0 })).toBeNull();
    });

    it("does not return battery at 0% when the cutoff is 0 (Off)", () => {
      expect(shouldAutoDisable({ ...base, session: session(), battery: onBattery(0), thresholdPercent: 0 })).toBeNull();
    });

    it("does not return battery on a desktop Mac without a battery", () => {
      const battery: Battery = { hasBattery: false, percent: null, onAC: true };
      expect(shouldAutoDisable({ ...base, session: session(), battery })).toBeNull();
    });

    it("never returns battery when hasBattery is false, even if a percentage is present", () => {
      const battery: Battery = { hasBattery: false, percent: 10, onAC: false };
      expect(shouldAutoDisable({ ...base, session: session(), battery })).toBeNull();
    });

    it("does not return battery when the percentage is unknown", () => {
      const battery: Battery = { hasBattery: true, percent: null, onAC: false };
      expect(shouldAutoDisable({ ...base, session: session(), battery })).toBeNull();
    });

    it("returns null when there is no session, even on low battery", () => {
      // Auto-off only applies to sessions the extension started.
      expect(shouldAutoDisable({ ...base, session: null, battery: onBattery(10) })).toBeNull();
    });
  });

  describe("precedence", () => {
    it("prefers restart over timer and battery", () => {
      const result = shouldAutoDisable({
        now: BOOT + 10_000,
        session: session({ endsAt: BOOT, bootTime: BOOT }),
        currentBootTime: BOOT + 1,
        battery: { hasBattery: true, percent: 1, onAC: false },
        thresholdPercent: 20,
      });
      expect(result).toBe("restart");
    });

    it("prefers timer over battery", () => {
      const result = shouldAutoDisable({
        now: BOOT + 10_000,
        session: session({ endsAt: BOOT + 5_000 }),
        currentBootTime: BOOT,
        battery: { hasBattery: true, percent: 1, onAC: false },
        thresholdPercent: 20,
      });
      expect(result).toBe("timer");
    });

    it("returns null when no rule applies", () => {
      expect(shouldAutoDisable({ ...base, session: session({ endsAt: base.now + 60_000 }) })).toBeNull();
    });
  });
});
