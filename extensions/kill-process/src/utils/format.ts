import prettyBytes from "pretty-bytes";

/**
 * Format CPU percentage compactly so the List accessory fits.
 * One decimal keeps enough precision while saving width vs toFixed(2).
 */
export function formatCpu(cpu: number): string {
  if (!Number.isFinite(cpu)) {
    return "0%";
  }
  return `${cpu.toFixed(1)}%`;
}

/**
 * Format memory (given in KiB, as reported by `ps rss` / WorkingSet) compactly.
 * Binary units without a space (e.g. `100MiB`, `1GiB`) are shorter than the
 * default SI output (e.g. `105 MB`, `1.07 GB`) and match how OS monitors
 * report memory, preventing truncation of the List accessory.
 */
export function formatMemory(memKiB: number): string {
  if (!Number.isFinite(memKiB) || memKiB <= 0) {
    return "0B";
  }
  return prettyBytes(memKiB * 1024, { binary: true, space: false });
}

/**
 * Higher-precision representation for tooltips, where width is not constrained.
 * Keeps binary units (consistent with the accessory) but allows two fraction
 * digits and a space, e.g. `1.09 GiB` instead of the compact `1.1GiB`.
 */
export function formatMemoryDetailed(memKiB: number): string {
  if (!Number.isFinite(memKiB) || memKiB <= 0) {
    return "0B";
  }
  return prettyBytes(memKiB * 1024, { binary: true, maximumFractionDigits: 2 });
}

/**
 * Format system uptime (in seconds, as reported by `os.uptime()`) using its
 * two largest units, e.g. `3d 4h`, `5h 12m`, `7m`.
 */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0m";
  }
  const totalMinutes = Math.floor(seconds / 60);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) {
    return `${days}d ${hours}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}
