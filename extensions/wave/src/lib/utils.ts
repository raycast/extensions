import { Color } from "@raycast/api";
import { InvoiceStatus } from "./types";

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
      return Color.Yellow;
    default:
      return undefined;
  }
}
