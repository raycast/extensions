export function moveFirstMatchToFront<T>(array: T[], predicate: (item: T) => boolean): T[] {
  const index = array.findIndex(predicate);

  if (index <= 0) {
    return [...array];
  }

  return [array[index], ...array.slice(0, index), ...array.slice(index + 1)];
}
