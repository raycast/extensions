import { Color } from "@raycast/api";
import { InvoiceStatus, Money } from "./types";

export function getInvoiceStatusColor(status: InvoiceStatus) {
  switch (status) {
    case "PAID":
      return Color.Green;
    case "OVERDUE":
      return Color.Red;
    case "UNPAID":
      return Color.Orange;
    case "SENT":
      return Color.Blue;
    case "PARTIAL":
      return Color.Magenta;
    case "SAVED":
    case "VIEWED":
      return Color.Purple;
    default:
      return undefined;
  }
}

export function formatDate(date: string) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
  return formatter.format(new Date(date));
}
export function formatMoney(money: Money) {
  return money.currency.symbol + money.value;
}
