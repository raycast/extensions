// Convert country code to flag emoji
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return "🌍";
  }

  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

// Get a representative emoji for the menu bar icon
export function getMenuBarIcon(topCountryCode?: string): string {
  if (topCountryCode) {
    return getCountryFlag(topCountryCode);
  }
  return "📊";
}
