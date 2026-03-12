export function dateOnlyEpochFromLocalDate(value: Date): number {
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
}

export function instantEpochFromDate(value: Date): number {
  return value.getTime();
}

export function todayDateOnlyEpoch(now = new Date()): number {
  return dateOnlyEpochFromLocalDate(now);
}

export function tomorrowDateOnlyEpoch(now = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}
