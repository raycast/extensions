/** 12-hour clock label for a 0-23 hour, e.g. 0 -> "12a", 15 -> "3p". */
export function hourLabel(hour: number): string {
  const wrapped = ((hour % 24) + 24) % 24;
  const h = wrapped % 12 || 12;
  const suffix = wrapped < 12 ? "a" : "p";
  return `${h}${suffix}`;
}
