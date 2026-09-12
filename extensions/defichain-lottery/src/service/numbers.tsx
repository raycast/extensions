export function formatNumber(data: number, currency: string) {
  if (data === undefined) {
    return;
  }
  currency = currency === undefined ? "" : " " + currency;
  return "" + data.toFixed(2).replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1'") + "" + currency;
}
