export function formatSpeed(speed: number): string {
  if (speed >= 1_000) return `${(speed / 1_000).toFixed(2)} GB/s`;
  return `${speed >= 100 ? Math.round(speed) : speed.toFixed(1)} MB/s`;
}

export function formatBytes(bytes: number): string {
  return `${(bytes / 1_000_000_000).toFixed(2)} GB`;
}

export function formatBinaryBytes(bytes: number): string {
  const gibibyte = 1_073_741_824;
  if (bytes >= gibibyte && bytes % gibibyte === 0) return `${bytes / gibibyte} GiB`;
  return `${Math.round(bytes / 1_048_576)} MiB`;
}

export function formatDuration(seconds: number): string {
  if (seconds === 60) return "1 minute";
  return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
}

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
