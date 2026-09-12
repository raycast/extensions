export function formatCurrency(amount: number, currency: string = "JPY"): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
