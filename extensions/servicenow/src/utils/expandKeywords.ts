export function expandKeywords(...values: (string | null | undefined)[]): string[] {
  return Array.from(
    new Set(
      values
        .filter((v): v is string => Boolean(v))
        .flatMap((v) => v.split(/[\s_-]+/))
        .filter(Boolean),
    ),
  );
}
