export function formatAmount(amount: number): string {
  if (amount >= 1e9) {
    return `$${(amount / 1e9).toFixed(2)}B`;
  }
  if (amount >= 1e6) {
    return `$${(amount / 1e6).toFixed(2)}M`;
  }
  if (amount >= 1e3) {
    return `$${(amount / 1e3).toFixed(2)}K`;
  }
  return `$${amount.toFixed(2)}`;
}

export function formatPrice(price: number): string {
  if (price >= 1) {
    return `$${price.toFixed(2)}`;
  }
  return `$${price.toFixed(6)}`;
}
