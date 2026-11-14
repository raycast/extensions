/** Independent ISO 13616 mod-97-10 check (remainder 1 after rearrange + expand). */
export function ibanPassesMod97(iban: string): boolean {
  const compact = iban.replace(/[\s-]/g, "").toUpperCase();
  const rearranged = compact.slice(4) + compact.slice(0, 4);
  let numeric = "";
  for (const ch of rearranged) {
    if (ch >= "0" && ch <= "9") {
      numeric += ch;
    } else if (ch >= "A" && ch <= "Z") {
      numeric += String(ch.charCodeAt(0) - 55);
    } else {
      return false;
    }
  }
  let remainder = 0n;
  for (const ch of numeric) {
    remainder = (remainder * 10n + BigInt(ch)) % 97n;
  }
  return remainder === 1n;
}
