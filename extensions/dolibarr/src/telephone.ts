/** Fewer digits than this cannot be a dialable number. */
const MIN_DIGITS = 3;

/**
 * Dolibarr stores numbers inconsistently — "+49 721 1234-100" and "(0721) 1234/100" both occur.
 * A tel: link containing spaces or brackets is not reliably accepted, so everything except digits
 * and a leading plus is removed.
 */
export function telUrl(raw: string | null): string | null {
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const hasCountryPrefix = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < MIN_DIGITS) return null;

  return `tel:${hasCountryPrefix ? "+" : ""}${digits}`;
}

export function mailtoUrl(address: string | null): string | null {
  if (address === null) return null;
  const trimmed = address.trim();
  if (!trimmed.includes("@")) return null;
  return `mailto:${trimmed}`;
}
