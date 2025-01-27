export function isArrayEquals<T>(array: T[], other: T[]): boolean {
  if (array.length !== other.length) {
    return false;
  }

  return array.every((value, index) => value === other[index]);
}
