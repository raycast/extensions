export const targetSeconds = 7.5 * 3600;

export function dateKey(date: Date): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

export function monthStart(date: Date, offset = 0): Date {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
}

export function shiftDay(date: Date, offset: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + offset);
}

export function duration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return [
    hours ? `${hours}h` : "",
    minutes ? `${minutes}m` : "",
    remainder ? `${remainder}s` : "",
  ].filter(Boolean).join(" ") || "0h";
}

export function progress(seconds: number): string {
  if (seconds < targetSeconds) return `${duration(targetSeconds - seconds)} left`;
  if (seconds > targetSeconds) return `${duration(seconds - targetSeconds)} over`;
  return "Goal met";
}
