export type Battery = { hasBattery: boolean; percent: number | null; onAC: boolean };

export type Session = { startedAt: number; endsAt: number | null; bootTime: number | null };

export type AutoDisableReason = "restart" | "timer" | "battery";

export function parseSleepDisabled(pmsetG: string): boolean {
  const match = /SleepDisabled\s+(\d)/.exec(pmsetG);
  return match !== null && match[1] === "1";
}

export function parseBattery(pmsetBatt: string): Battery {
  const onAC = pmsetBatt.includes("'AC Power'");
  const match = /(\d{1,3})%/.exec(pmsetBatt);
  if (!match || !pmsetBatt.includes("InternalBattery")) {
    return { hasBattery: false, percent: null, onAC };
  }
  return { hasBattery: true, percent: Number(match[1]), onAC };
}

export function parseBootTime(sysctlOut: string): number | null {
  const match = /sec\s*=\s*(\d+)/.exec(sysctlOut);
  return match ? Number(match[1]) : null;
}

// The longest duration a typed entry may ask for. Longer than this, Indefinitely is the better choice.
export const MAX_CUSTOM_MINUTES = 7 * 24 * 60;

const DURATION_PATTERN = /^(?:(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?))?\s*(?:(\d+(?:\.\d+)?)\s*(?:m|mins?|minutes?)?)?$/;

// Reads a duration typed by the user, in whole minutes. A bare number is minutes. Accepts forms like "45", "45m",
// "2h", "2.5h", "1h30", "1h 30m" and "1:30". Returns null for anything else, or for under a minute or over the maximum.
export function parseDuration(text: string): number | null {
  const input = text.trim().toLowerCase();
  let minutes: number;
  const clock = /^(\d+):([0-5]\d)$/.exec(input);
  if (clock) {
    minutes = Number(clock[1]) * 60 + Number(clock[2]);
  } else {
    const match = DURATION_PATTERN.exec(input);
    if (!match || (match[1] === undefined && match[2] === undefined)) {
      return null;
    }
    minutes = Math.round(Number(match[1] ?? 0) * 60 + Number(match[2] ?? 0));
  }
  return minutes >= 1 && minutes <= MAX_CUSTOM_MINUTES ? minutes : null;
}

export function formatRemaining(ms: number): string {
  if (ms < 60_000) {
    return "<1m";
  }
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes}m`;
  }
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

export function shouldAutoDisable(input: {
  session: Session | null;
  currentBootTime: number | null;
  now: number;
  battery: Battery;
  thresholdPercent: number;
}): AutoDisableReason | null {
  const { session, currentBootTime, now, battery, thresholdPercent } = input;

  // Auto-off only applies to sessions the extension started.
  if (session === null) {
    return null;
  }
  if (currentBootTime != null && session.bootTime != null && session.bootTime !== currentBootTime) {
    return "restart";
  }
  if (session?.endsAt != null && now >= session.endsAt) {
    return "timer";
  }
  if (
    thresholdPercent > 0 &&
    battery.hasBattery &&
    !battery.onAC &&
    battery.percent != null &&
    battery.percent <= thresholdPercent
  ) {
    return "battery";
  }
  return null;
}
