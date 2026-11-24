/** Shorten ordinary company names only; retain fund, preferred and derivative identities. */
export function securityName(description: string | undefined, assetType?: string): string {
  if (!description) return "";
  if (assetType !== "EQUITY" || /\b(ETF|FUND|TRUST|PREFERRED|PFD|WARRANT|RIGHTS|UNITS)\b/i.test(description))
    return description;
  const cleaned = description
    .replace(
      /(?:,?\s+(?:INCORPORATED|INC\.?|CORPORATION|CORP\.?|PLC|LTD\.?|LIMITED|CLASS\s+[A-Z]|SERIES\s+[A-Z]|SPONSORED|ADR|ADS))+$/i,
      "",
    )
    .trim();
  if (!cleaned) return description;
  // Preserve intentional mixed case; only convert shouting API descriptions.
  return cleaned === cleaned.toUpperCase()
    ? cleaned
        .split(" ")
        .map((word) => (word.length <= 3 || /[&\d]/.test(word) ? word : word[0] + word.slice(1).toLowerCase()))
        .join(" ")
    : cleaned;
}
