export function priceConverter(price: number): string {
  return price.toFixed(3).replace(".", ",");
}
