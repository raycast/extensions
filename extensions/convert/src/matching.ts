export function checkHslMatch(value: string) {
  const hslMatch = value.match(
    /^hsla?\(\s*(?<h>\d{1,3})\s*(?:,\s*|\s+)(?<s>\d{1,3})%?\s*(?:,\s*|\s+)(?<l>\d{1,3})%?\s*(?:[,/]\s*(?<alpha>(?:\d+\.?\d*|\.?\d+)%?))?\s*\)$/i,
  );
  if (!hslMatch) {
    return null;
  }
  return hslMatch.groups;
}
