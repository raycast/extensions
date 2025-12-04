import moment from "moment";
import { currentLocale } from "./utils";

export function formatCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(currentLocale, { style: "currency", currency: currencyCode }).format(amount / 100);
}

export function formatRelativeDate(dateString: string) {
  return moment(dateString).fromNow();
}

export function formatShortDate(dateString: string) {
  return moment(dateString).format("YYYY-MM-DD");
}
