export function formatPrice(price: number) {
  if (price <= 0 || !Number.isFinite(price)) return "N/A";
  return price.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
