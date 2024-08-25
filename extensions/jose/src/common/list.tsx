// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function RemoveDuplicatesByField(array: any, field: string) {
  const seen = new Set();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return array.filter((item: any) => {
    const value = item[field];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}
