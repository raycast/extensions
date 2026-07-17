export function getCountryFlag(countryCode: string | undefined): string {
  if (!countryCode) return "";
  const code = countryCode.toUpperCase();

  if (code.length === 2) {
    // Exclude older 2-letter codes that don't have flags
    if (["YU", "CS", "AN", "SU", "DD", "ZR"].includes(code)) return "";
    // Generate flag for 2-letter country codes
    try {
      const flag = String.fromCodePoint(...code.split("").map((char) => 127397 + char.charCodeAt(0)));
      return flag.length >= 2 ? flag : "";
    } catch {
      return "";
    }
  } else if (code.length === 3 && code === "WLD") {
    return "🌎";
  }

  return "";
}
