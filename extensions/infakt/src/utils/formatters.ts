export function formatPrice(number: number, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(number / 100);
}
