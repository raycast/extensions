export function formatPrice(price: number | null, currency: string): string | undefined {
  if (price == null) return undefined;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(price);
  } catch {
    // Intl throws on currency codes it doesn't know.
    return `${price} ${currency}`;
  }
}
