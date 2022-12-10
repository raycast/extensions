export function formatToYearlyRate(rate: number): string {
  return (rate * 365 * 100).toFixed(2);
}

export function formatToDailyRate(rate: number): string {
  return (rate * 100).toFixed(5);
}

export function getOfferClosedDate(offer: any) {
  const { period } = offer;
  const opened = new Date(offer.mtsOpening);
  const closedDate = opened.getTime() + period * 24 * 60 * 60 * 1000;

  return closedDate;
}
