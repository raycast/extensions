export function formatToYearlyRate(rate: number): string {
  return (rate * 365 * 100).toFixed(2);
}

export function formatToDailyRate(rate: number): string {
  return (rate * 100).toFixed(5);
}
