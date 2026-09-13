export function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) {
    throw new Error(`expected an item at index ${index}, got ${items.length}`);
  }
  return item;
}

export function first<T>(items: readonly T[]): T {
  return at(items, 0);
}

export function last<T>(items: readonly T[]): T {
  return at(items, items.length - 1);
}

export function fetchCall(
  mock: { mock: { calls: unknown[][] } },
  index: number,
): { url: string; init: RequestInit } {
  const call = at(mock.mock.calls, index);
  return { url: String(call[0]), init: (call[1] ?? {}) as RequestInit };
}
