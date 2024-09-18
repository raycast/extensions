export function toURLSearchParams(
  params: Record<string, string | number | boolean | undefined>,
) {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  );
}
