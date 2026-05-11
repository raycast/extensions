import { Color } from "@raycast/api";
import { InvoiceStatus } from "./types";

export const STORAGE_KEYS = {
  clients: "clients",
  invoices: "invoices",
  invoiceCounter: "invoiceCounter",
} as const;

export const STATUS_COLORS: Record<InvoiceStatus, Color> = {
  draft: Color.SecondaryText,
  sent: Color.Blue,
  paid: Color.Green,
};

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
};

// PDF dimensions (A4 in points)
export const PDF = {
  WIDTH: 595.28,
  HEIGHT: 841.89,
  MARGIN: 50,
  get CONTENT_WIDTH() {
    return this.WIDTH - this.MARGIN * 2;
  },
} as const;
