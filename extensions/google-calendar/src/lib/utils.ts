export function stringToDate(text: string | null | undefined) {
  return text ? new Date(text) : undefined;
}
