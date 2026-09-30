export function formatCurrency(number: number, currencyCode: string) {
  return Intl.NumberFormat("uk-UA", {
    currency: currencyCode,
    style: "currency",
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
    .format(number)
    .replace(",", ".");
}
