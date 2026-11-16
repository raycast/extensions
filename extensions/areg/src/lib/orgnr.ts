const WEIGHTS = [3, 2, 7, 6, 5, 4, 3, 2];

export function isValidOrgnr(orgnr: string): boolean {
  if (!/^\d{9}$/.test(orgnr)) return false;
  const sum = WEIGHTS.reduce((acc, weight, i) => acc + weight * Number(orgnr[i]), 0);
  const remainder = sum % 11;
  const check = remainder === 0 ? 0 : 11 - remainder;
  return check !== 10 && check === Number(orgnr[8]);
}

/**
 * Returns the organisation number when the whole query is one, in any common spelling:
 * `923609016`, `923 609 016`, `923.609.016`, `NO923609016MVA`, `NO 923 609 016 MVA`.
 */
export function parseOrgnr(query: string): string | undefined {
  const compact = query
    .trim()
    .toUpperCase()
    .replace(/^NO/, "")
    .replace(/MVA$/, "")
    .replace(/[\s.-]/g, "");
  return /^\d{9}$/.test(compact) ? compact : undefined;
}

/** Finds an organisation number anywhere in a piece of text, preferring one with a valid checksum. */
export function extractOrgnr(text: string): string | undefined {
  const candidates = [...text.matchAll(/(?<!\d)(\d{3})[\s.]?(\d{3})[\s.]?(\d{3})(?!\d)/g)].map(
    (m) => `${m[1]}${m[2]}${m[3]}`,
  );
  return candidates.find(isValidOrgnr) ?? candidates[0];
}

export function formatOrgnr(orgnr: string): string {
  return /^\d{9}$/.test(orgnr) ? `${orgnr.slice(0, 3)} ${orgnr.slice(3, 6)} ${orgnr.slice(6)}` : orgnr;
}
