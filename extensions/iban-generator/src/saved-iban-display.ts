import { invalidKindTitle } from "./validity";
import type { SavedIban } from "./storage";

export function savedIbanSummary(record: SavedIban): string {
  const parts: string[] = [];
  if (record.invalidKind) {
    parts.push(`[Invalid: ${invalidKindTitle(record.invalidKind)}]`);
  }
  parts.push(record.flag, record.format === "grouped" ? record.formatted : record.iban);
  if (record.note) {
    parts.push(`· ${record.note}`);
  } else if (record.bankName) {
    parts.push(`· ${record.bankName}`);
  }
  return parts.join(" ");
}

export function ibanPasteHudMessage(record: SavedIban): string {
  if (record.invalidKind) {
    return "Pasted invalid test IBAN";
  }
  return `Pasted ${record.flag} IBAN`;
}
