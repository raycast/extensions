import { Color } from "@raycast/api";
import { Customer, InvoiceItem, InvoiceStatus, Money } from "./types";

// we use a separate function because in the case of discounts, the value returned from the api is adjusted to account for it
export function calculateInvoiceItemAmount(item: InvoiceItem) {
  return Number(+item.unitPrice * +item.quantity).toFixed(item.subtotal.currency.exponent);
}
export function getInvoiceStatusColor(status: InvoiceStatus) {
  switch (status) {
    case "PAID":
    case "OVERPAID":
      return Color.Green;
    case "OVERDUE":
      return Color.Red;
    case "UNPAID":
      return Color.Orange;
    case "SENT":
      return Color.Blue;
    case "PARTIAL":
      return Color.Yellow;
    case "SAVED":
    case "VIEWED":
      return Color.Purple;
    case "DRAFT":
      return "#D4DDE3";
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
export function getCustomerJoinedName(customer: Customer) {
  return !customer.firstName || !customer.lastName ? "" : `${customer.firstName} ${customer.lastName}`;
}
