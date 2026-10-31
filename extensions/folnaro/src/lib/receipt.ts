import { statSync } from "node:fs";
import { basename, extname } from "node:path";
import type { StringKey } from "./text";

/** File types Folnaro keeps as receipts (PDF and images, docs/mcp/expenses.md). */
export const RECEIPT_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg", "heic", "heif", "tif", "tiff"]);

/** The file travels base64 encoded over stdio; larger scans belong in the app's import. */
export const MAX_RECEIPT_BYTES = 25 * 1024 * 1024;

export function isReceiptFile(path: string): boolean {
  return RECEIPT_EXTENSIONS.has(extname(path).slice(1).toLowerCase());
}

/**
 * Why a chosen file cannot be a receipt, as the text key to show under the file field, or
 * undefined when it can. A file that was moved or deleted after the form opened is reported as
 * unreadable instead of throwing.
 */
export function receiptFileProblem(
  file: string | undefined,
  size: (path: string) => number = (path) => statSync(path).size,
): StringKey | undefined {
  if (!file) return "receipt.validation.file";
  if (!isReceiptFile(file)) return "receipt.validation.type";
  try {
    return size(file) > MAX_RECEIPT_BYTES ? "receipt.validation.size" : undefined;
  } catch {
    return "receipt.validation.unreadable";
  }
}

/**
 * A first guess of the vendor from the file name, e.g. "2026-10-02_Hetzner_Rechnung_R123.pdf"
 * becomes "Hetzner". Dates, numbers and words like "Rechnung" or "invoice" are dropped. The
 * person always sees and can change the guess before anything is saved.
 */
export function guessVendor(path: string): string {
  const stem = basename(path, extname(path));
  const noise =
    /^(rechnung|invoice|beleg|receipt|quittung|bon|scan|kopie|copy|re|rg|nr|no|order|bestellung|document|dokument|img|image)$/i;
  const words = stem
    .split(/[\s_\-.,()[\]]+/)
    .filter((word) => word.length > 1 && !/\d/.test(word) && !noise.test(word));
  return words.slice(0, 3).join(" ");
}

/** A receipt date in the file name ("2026-10-02", "20261002" or "02.10.2026"), if there is one. */
export function guessDate(path: string): Date | undefined {
  const name = basename(path);
  const iso = /(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])/.exec(name);
  if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  const german = /(0[1-9]|[12]\d|3[01])\.(0[1-9]|1[0-2])\.(20\d{2})/.exec(name);
  if (german) return new Date(Number(german[3]), Number(german[2]) - 1, Number(german[1]));
  return undefined;
}

/** Expense categories of expenses_create, in the order Folnaro lists them. */
export const EXPENSE_CATEGORIES = [
  "software",
  "hardwareSmall",
  "office",
  "telecom",
  "travel",
  "travelFares",
  "travelMeals",
  "training",
  "advertising",
  "subcontractors",
  "goods",
  "postage",
  "rent",
  "vehicle",
  "insurance",
  "memberships",
  "legalAndTaxAdvice",
  "bankFees",
  "entertainment",
  "gifts",
  "other",
] as const;
