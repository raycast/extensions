export function capitalizeFirstLetter(string: string | null | undefined) {
  if (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  return "";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
