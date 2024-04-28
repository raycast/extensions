import { moment } from "./utils";

export function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: currencyCode }).format(amount / 100);
}

export function formatDate(dateString: string) {
  return moment(dateString).fromNow();
}
