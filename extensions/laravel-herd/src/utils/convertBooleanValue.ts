export function convertBooleanValue(value: string): boolean | string {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return value;
}
