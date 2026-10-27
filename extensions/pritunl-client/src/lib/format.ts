import { Profile } from "./types";

/** "acme-prod-vpn (jane)" becomes "acme-prod-vpn". */
export function displayName(profile: Profile): string {
  return profile.name.replace(/\s*\([^)]*\)$/, "");
}

/** 8040 becomes "2h 14m". */
export function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/** Connected profiles first, then alphabetical. */
export function sortProfiles(profiles: Profile[]): Profile[] {
  return [...profiles].sort(
    (a, b) => Number(b.connected) - Number(a.connected) || displayName(a).localeCompare(displayName(b)),
  );
}

/** 2912 becomes "00:48:32". */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return [Math.floor(whole / 3600), Math.floor((whole % 3600) / 60), whole % 60]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

const BIT_UNITS = ["bps", "Kbps", "Mbps", "Gbps"];

/** 8420000 bytes per second becomes "67.4 Mbps". Uses powers of 1000, like speed tests. */
export function formatBits(bytesPerSecond: number): string {
  let value = Math.max(0, bytesPerSecond) * 8;
  let unit = 0;
  while (value >= 1000 && unit < BIT_UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  const digits = unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${BIT_UNITS[unit]}`;
}
