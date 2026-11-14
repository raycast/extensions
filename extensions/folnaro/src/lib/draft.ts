import { parseDecimalInput } from "./format";
import { t } from "./text";
import type { DraftLineInput } from "./types";

/** Units offered in the form; the helper takes any UN/ECE Rec. 20 code (docs/mcp/documents.md). */
export const UNITS = ["HUR", "DAY", "H87", "LS", "MON"] as const;
export const TAX_RATES = ["19", "7", "0"] as const;

/** One line item block of the form; `key` names its fields (`title-<key>`, `price-<key>`, …). */
export interface LineState {
  key: number;
}

export type FormValues = Record<string, string | Date | null | undefined>;

/**
 * Turns the form into documents_create_draft lines, or field errors.
 * Unit prices are net; Folnaro computes line totals and VAT itself.
 */
export function buildLines(
  values: FormValues,
  lines: LineState[],
): { lines?: DraftLineInput[]; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const result: DraftLineInput[] = [];
  for (const { key } of lines) {
    const title = String(values[`title-${key}`] ?? "").trim();
    const quantity = parseDecimalInput(String(values[`quantity-${key}`] ?? ""));
    const price = parseDecimalInput(String(values[`price-${key}`] ?? ""));
    if (!title) errors[`title-${key}`] = t("draft.validation.lineTitle");
    if (!quantity) errors[`quantity-${key}`] = t("draft.validation.quantity");
    if (!price) errors[`price-${key}`] = t("draft.validation.price");
    if (title && quantity && price) {
      result.push({
        kind: "item",
        title,
        quantity,
        unit: String(values[`unit-${key}`] || "HUR"),
        unit_price: price,
        tax_rate: String(values[`tax-${key}`] || "19"),
      });
    }
  }
  return Object.keys(errors).length ? { errors } : { lines: result, errors };
}
