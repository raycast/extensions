/* What people type in Convert: "100 usd", "usd 100", "١٠٠ دولار", "$1,299" or "50 €". No Raycast imports, so tests run in plain Node. */
import { genehCurrency, genehFindAmount, genehNormalizeNumber } from "./lite.js";

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function parseAmount(text: string): { amount: number; currency: string } | null {
  const s = String(text ?? "")
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/٫/g, ".")
    .replace(/٬/g, ",")
    .trim();
  if (!s) return null;
  const found = genehFindAmount(s);
  if (found) return found;
  const m = s.match(/^([0-9][0-9.,\s]*?)\s*([^\s0-9.,].*)$/) ?? s.match(/^([^\s0-9.,].*?)\s*([0-9][0-9.,\s]*)$/);
  if (!m) return null;
  const [numPart, ccyPart] = /^[0-9]/.test(m[1]) ? [m[1], m[2]] : [m[2], m[1]];
  const currency = genehCurrency(ccyPart);
  const amount = parseFloat(genehNormalizeNumber(numPart.replace(/\s/g, "").replace(/[.,]$/, "")));
  return currency && isFinite(amount) && amount > 0 ? { amount, currency } : null;
}
