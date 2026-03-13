export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/\D/g, "")) / 100;
}
