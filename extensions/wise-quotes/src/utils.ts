export function formatCurrency(amount: number, currency: string) {
  return (
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount) + ` ${currency}`
  );
}
