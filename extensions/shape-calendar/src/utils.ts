import { getPreferenceValues } from "@raycast/api";

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (m > 0) {
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  return `${s}s`;
}

export function formatDistance(meters: number): string {
  const { distanceUnit } = getPreferenceValues<{ distanceUnit: string }>();
  if (distanceUnit === "mi") {
    return `${(meters / 1609.34).toFixed(2)} mi`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export function formatSpeed(
  metersPerSecond: number,
  sportType: string,
): string {
  const { distanceUnit } = getPreferenceValues<{ distanceUnit: string }>();

  if (metersPerSecond === 0) return "";

  if (sportType === "run" || sportType === "swim") {
    const pace = 1 / (metersPerSecond * 0.06);
    if (distanceUnit === "mi") {
      const paceMiles = pace * 1.60934;
      return `${Math.floor(paceMiles)}:${String(Math.floor((paceMiles % 1) * 60)).padStart(2, "0")} /mi`;
    }
    return `${Math.floor(pace)}:${String(Math.floor((pace % 1) * 60)).padStart(2, "0")} /km`;
  }

  if (distanceUnit === "mi") {
    return `${(metersPerSecond * 2.23694).toFixed(1)} mph`;
  }
  return `${(metersPerSecond * 3.6).toFixed(1)} km/h`;
}

export function formatElevationGain(meters: number): string {
  const { distanceUnit } = getPreferenceValues<{ distanceUnit: string }>();
  if (distanceUnit === "mi") {
    return `${(meters * 3.28084).toFixed(0)} ft`;
  }
  return `${Math.round(meters)} m`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

export function formatSectionDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  if (date.getTime() === today.getTime()) return `Today — ${monthDay}`;
  if (date.getTime() === tomorrow.getTime()) return `Tomorrow — ${monthDay}`;
  if (date.getTime() === yesterday.getTime()) return `Yesterday — ${monthDay}`;
  return `${dayName} — ${monthDay}`;
}

export function getDateRange(
  pastDays: number,
  futureDays = 30,
): { from: string; to: string } {
  const from = new Date();
  from.setDate(from.getDate() - pastDays);
  const to = new Date();
  to.setDate(to.getDate() + futureDays);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export function convertDistanceToMeters(
  value: string,
  unit: string,
): number | undefined {
  const num = parseFloat(value);
  if (isNaN(num)) return undefined;
  return unit === "mi" ? num * 1609.344 : num * 1000;
}

export function parseDuration(input: string): number | undefined {
  const trimmed = input.trim().toLowerCase();

  // HH:MM:SS
  const hmsMatch = trimmed.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
  if (hmsMatch) {
    return (
      parseInt(hmsMatch[1]) * 3600 +
      parseInt(hmsMatch[2]) * 60 +
      parseInt(hmsMatch[3])
    );
  }

  // MM:SS
  const msMatch = trimmed.match(/^(\d{1,3}):(\d{1,2})$/);
  if (msMatch) {
    return parseInt(msMatch[1]) * 60 + parseInt(msMatch[2]);
  }

  // Natural: 1h30m, 45m, 30s, etc.
  let total = 0;
  let matched = false;
  const hourMatch = trimmed.match(/(\d+)\s*h/);
  const minMatch = trimmed.match(/(\d+)\s*m(?:in)?(?!\s*s)/);
  const secMatch = trimmed.match(/(\d+)\s*s/);

  if (hourMatch) {
    total += parseInt(hourMatch[1]) * 3600;
    matched = true;
  }
  if (minMatch) {
    total += parseInt(minMatch[1]) * 60;
    matched = true;
  }
  if (secMatch) {
    total += parseInt(secMatch[1]);
    matched = true;
  }

  if (matched) return total;

  // Plain number = minutes
  const num = parseFloat(trimmed);
  if (!isNaN(num)) return num * 60;

  return undefined;
}
