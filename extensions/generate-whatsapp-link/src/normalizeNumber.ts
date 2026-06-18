/**
 * Normalizes a raw phone number input into E.164 digits (no +).
 *
 * Rules:
 * - If the input starts with "+", strip all non-digits and use as-is (international).
 * - Otherwise strip non-digits, drop leading zeros, and if the result is ≤11 digits
 *   prepend countryCode (assumed missing).
 * - Returns null when the final digit count falls outside 8–15 (E.164 range).
 */
export function normalizeNumber(phoneNumber: string, countryCode: string): string | null {
  const trimmed = phoneNumber.trim();
  let digits: string;

  if (trimmed.startsWith("+")) {
    digits = trimmed.replace(/\D/g, "");
  } else {
    const stripped = trimmed.replace(/\D/g, "").replace(/^0+/, "");
    const alreadyHasCode = countryCode && stripped.startsWith(countryCode) && stripped.length > countryCode.length;
    digits = !alreadyHasCode && stripped.length <= 11 && countryCode ? `${countryCode}${stripped}` : stripped;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function buildWhatsAppUrl(digits: string, message?: string): string {
  const base = `https://wa.me/${digits}`;
  return message?.trim() ? `${base}?text=${encodeURIComponent(message)}` : base;
}
