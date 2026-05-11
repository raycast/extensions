export function lowerCaseKeys(obj: Record<string, unknown>) {
  return Object.entries(obj).reduce(
    (acc, [key, value]) => {
      acc[key.toLowerCase()] = value;
      return acc;
    },
    {} as Record<string, unknown>,
  );
}
