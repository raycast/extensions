export function isEmpty(value: string | undefined | null): boolean {
  return value === undefined || value === null || value.trim() === "";
}
