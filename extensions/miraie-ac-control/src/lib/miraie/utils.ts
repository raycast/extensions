export function isValidEmail(addr: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(addr);
}

export function toFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return -1.0;
  }
  try {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return isNaN(num) ? -1.0 : num;
  } catch {
    return -1.0;
  }
}
