export function getCountryFlag(country: string) {
  // Basic country to emoji flag mapping
  const countryFlags: { [key: string]: string } = {
    Bahrain: "🇧🇭",
    "Saudi Arabia": "🇸🇦",
    Australia: "🇦🇺",
    Japan: "🇯🇵",
    China: "🇨🇳",
    USA: "🇺🇸", // For Miami, Austin, Las Vegas
    Italy: "🇮🇹", // For Imola, Monza
    Monaco: "🇲🇨",
    Spain: "🇪🇸",
    Canada: "🇨🇦",
    Austria: "🇦🇹",
    UK: "🇬🇧", // For Great Britain
    Hungary: "🇭🇺",
    Belgium: "🇧🇪",
    Netherlands: "🇳🇱",
    Azerbaijan: "🇦🇿",
    Singapore: "🇸🇬",
    Mexico: "🇲🇽",
    Brazil: "🇧🇷",
    Qatar: "🇶🇦",
    UAE: "🇦🇪", // For Abu Dhabi
  };
  // Heuristic to match country names (e.g. "UK" for "Great Britain")
  if (country === "Great Britain") return countryFlags["UK"];
  if (country === "UAE") return countryFlags["UAE"];
  if (country === "USA") return countryFlags["USA"]; // All US races
  return countryFlags[country] || "🏳️"; // Added placeholder flag
}

export function getNationalityFlag(nationality: string) {
  const nationalityFlags: { [key: string]: string } = {
    British: "🇬🇧",
    Dutch: "🇳🇱",
    Spanish: "🇪🇸",
    German: "🇩🇪",
    Mexican: "🇲🇽",
    Monegasque: "🇲🇨",
    French: "🇫🇷",
    Australian: "🇦🇺",
    Finnish: "🇫🇮",
    Canadian: "🇨🇦",
    Japanese: "🇯🇵",
    Thai: "🇹🇭",
    Danish: "🇩🇰",
    Chinese: "🇨🇳",
    American: "🇺🇸",
    Italian: "🇮🇹", // Added for constructors like Ferrari
    Austrian: "🇦🇹", // Added for constructors like Red Bull Racing
    Swiss: "🇨🇭", // Added for constructors like Sauber
  };
  // Heuristic for constructors
  if (nationality === "German") return nationalityFlags["German"];
  if (nationality === "French") return nationalityFlags["French"];
  if (nationality === "Swiss") return nationalityFlags["Swiss"];
  return nationalityFlags[nationality] || "🏳️"; // Added placeholder flag
}
