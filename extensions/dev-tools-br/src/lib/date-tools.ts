const DAY_MS = 86_400_000;

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function daysBetween(start: Date, end: Date, inclusive: boolean): number {
  const difference = Math.abs(Math.round((utcDay(end) - utcDay(start)) / DAY_MS));
  return difference + (inclusive ? 1 : 0);
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(utcDay(date));
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}
