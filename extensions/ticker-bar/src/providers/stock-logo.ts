export function stockLogoUrl(symbol: string) {
  return `https://images.financialmodelingprep.com/symbol/${encodeURIComponent(symbol.toUpperCase())}.png`;
}
