const FALLBACK_VALUE = "[[to be completed]]";

/**
 * Validates and extracts SIREN from input (handles both 9-digit SIREN and 14-digit SIRET)
 */
export function validateAndExtractSiren(input: string): string | null {
  if (!input) return null;

  // Clean the input - remove spaces, hyphens, and other separators
  const cleaned = input.replace(/[\s\-.]/g, "");

  // Check if it's all digits
  if (!/^\d+$/.test(cleaned)) {
    return null;
  }

  // Check length - should be 9 (SIREN) or 14 (SIRET)
  if (cleaned.length === 9) {
    return cleaned; // Valid SIREN
  }

  if (cleaned.length === 14) {
    return cleaned.substring(0, 9); // Extract SIREN from SIRET
  }

  return null; // Invalid length
}

/**
 * Formats SIREN with non-breaking spaces (123456789 → 123 456 789)
 */
export function formatSiren(siren: string): string {
  if (!siren) return FALLBACK_VALUE;

  // Clean the input first
  const cleaned = siren.replace(/[\s\-.]/g, "");

  if (cleaned.length !== 9) {
    return siren; // Return as-is if not valid format
  }

  // Format with non-breaking spaces
  return `${cleaned.substring(0, 3)}\u00A0${cleaned.substring(3, 6)}\u00A0${cleaned.substring(6, 9)}`;
}

/**
 * Formats numbers with French conventions (1500.50 → 1 500,50)
 */
export function formatFrenchNumber(input: string | number): string {
  if (!input && input !== 0) return FALLBACK_VALUE;

  const numStr = typeof input === "number" ? input.toString() : input.toString();

  // Handle empty or invalid strings
  if (!numStr || numStr.trim() === "") return FALLBACK_VALUE;

  // Parse the number
  const num = parseFloat(numStr.replace(/,/g, ".").replace(/\s/g, ""));

  if (isNaN(num)) return FALLBACK_VALUE;

  // Format with French conventions
  const formatted = num.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });

  // Replace regular spaces with non-breaking spaces
  return formatted.replace(/ /g, "\u00A0");
}

/**
 * Converts a string to Title Case (first letter capitalized)
 */
export function toTitleCase(str: string): string {
  if (!str) return "";

  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      // Handle French articles and prepositions that should stay lowercase
      const lowercaseWords = ["de", "du", "des", "le", "la", "les", "et", "à", "au", "aux", "en", "sur", "sous"];
      if (lowercaseWords.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Formats a representative's name according to French conventions: FirstName LASTNAME
 */
export function formatRepresentativeName(prenoms: string[], nom: string): string {
  if (!prenoms?.length && !nom) return FALLBACK_VALUE;

  // Format first name(s): First letter capitalized, rest lowercase
  const formattedPrenoms =
    prenoms
      ?.map((prenom) => (prenom ? toTitleCase(prenom.trim()) : ""))
      .filter(Boolean)
      .join(" ") || "";

  // Format last name: All uppercase
  const formattedNom = nom ? nom.trim().toUpperCase() : "";

  return `${formattedPrenoms} ${formattedNom}`.trim() || FALLBACK_VALUE;
}

/**
 * Formats a city name according to French conventions
 */
export function formatCityName(cityName: string): string {
  if (!cityName) return FALLBACK_VALUE;

  // Handle both spaces and hyphens correctly
  return cityName
    .toLowerCase()
    .replace(/[\s-]+/g, (match) => {
      // Preserve the original separator (space or hyphen)
      return match.includes("-") ? "-" : " ";
    })
    .split(/(\s+|-+)/) // Split while preserving separators
    .map((part) => {
      // If it's a separator, return as-is
      if (/^[\s-]+$/.test(part)) return part;

      // Exceptions for French particles
      const exceptions = ["de", "du", "des", "le", "la", "les", "sur", "sous", "en"];
      return exceptions.includes(part) ? part : toTitleCase(part);
    })
    .join("");
}
