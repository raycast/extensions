export default function uniqueByKey<T>(array: T[], key: keyof T): T[] {
  const seen = new Set();
  const result: T[] = [];
  for (const item of array) {
    const value = item[key];
    if (!seen.has(value)) {
      seen.add(value);
      result.push(item);
    }
  }
  return result;
}
