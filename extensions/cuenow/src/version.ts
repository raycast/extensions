/**
 * Whether `version` is older than `minimum`, comparing dot-separated numbers.
 *
 * Parts are compared as numbers, not text, so 1.10.0 is newer than 1.5.1. A missing part
 * counts as 0 (1.5 is 1.5.0), and anything trailing the digits of a part, such as a
 * "-beta" suffix, is ignored.
 */
export function isOlderThan(version: string, minimum: string): boolean {
  const parse = (value: string) => value.split(".").map((part) => parseInt(part, 10) || 0);
  const have = parse(version);
  const need = parse(minimum);

  for (let index = 0; index < Math.max(have.length, need.length); index++) {
    const difference = (have[index] ?? 0) - (need[index] ?? 0);
    if (difference !== 0) {
      return difference < 0;
    }
  }

  return false;
}
