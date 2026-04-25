const OFFSET = 0x1f1e6 - "A".charCodeAt(0);

// spoo falls back to these placeholder codes when IP geolocation fails.
const UNKNOWN_CODES = new Set(["XX", "ZZ", "??", "UN", "UNKNOWN", ""]);

export interface CountryDisplay {
  flag: string;
  label: string;
  isKnown: boolean;
}

export function countryDisplay(
  code: string | undefined | null,
): CountryDisplay {
  if (!code) return { flag: "🌐", label: "Unknown", isKnown: false };
  const up = code.toUpperCase().trim();
  if (UNKNOWN_CODES.has(up) || up.length !== 2 || !/^[A-Z]{2}$/.test(up)) {
    return { flag: "🌐", label: "Unknown", isKnown: false };
  }
  const flag = String.fromCodePoint(
    up.charCodeAt(0) + OFFSET,
    up.charCodeAt(1) + OFFSET,
  );
  return { flag, label: up, isKnown: true };
}

export function flagFor(code: string | undefined | null): string {
  return countryDisplay(code).flag;
}
