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
