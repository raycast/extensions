export function searchInFields<T>(
  items: T[],
  query: string,
  fields: (item: T) => string[],
): T[] {
  if (!query) return items;
  const lowerQuery = query.toLowerCase();
  return items.filter((item) =>
    fields(item).some((field) => field.toLowerCase().includes(lowerQuery)),
  );
}
