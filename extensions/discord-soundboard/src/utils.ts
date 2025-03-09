export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce(
    (acc, item) => {
      const group = String(item[key]);
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}
