export function formatPrice(price: number) {
  return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
