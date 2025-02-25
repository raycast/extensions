export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  const billions = value / 1000000000;
  if (billions >= 1) {
    return `$${billions.toFixed(1)}B`;
  }
  const millions = value / 1000000;
  if (millions >= 1) {
    return `$${millions.toFixed(1)}M`;
  }
  const thousands = value / 1000;
  if (thousands >= 1) {
    return `$${thousands.toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}
