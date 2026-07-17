export default function dedupe<T extends { id: string }>(array: T[]) {
  const ids = new Set<string>();

  return array.filter((item) => {
    if (ids.has(item.id)) {
      return false;
    }

    ids.add(item.id);
    return true;
  });
}
