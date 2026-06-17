/**
 * Service for formatting French addresses with proper street type expansion
 * Uses the official INPI street type reference (Référentiel-typeVoie.csv)
 */

import addressTypeMappings from "../../assets/address-type-mappings.json";

export interface AddressTypeMapping {
  [abbreviation: string]: string;
}

/**
 * Expands abbreviated street types to their full form
 * BD → Boulevard, AV → Avenue, etc.
 */
export function expandStreetType(streetType: string): string {
  if (!streetType) return "";

  // Normalize input - remove extra spaces, convert to uppercase
  const normalized = streetType.trim().toUpperCase();

  // Check if we have a mapping for this abbreviation
  const expanded = addressTypeMappings[normalized as keyof typeof addressTypeMappings];

  if (expanded) {
    // Return with proper capitalization (Title Case)
    return toTitleCase(expanded);
  }

  // If no mapping found, return original with title case
  return toTitleCase(streetType);
}

/**
 * Formats a complete address with proper street type expansion
 */
export function formatAddress(address: {
  numeroVoie?: string;
  typeVoie?: string;
  libelleVoie?: string;
  codePostal?: string;
  commune?: string;
  [key: string]: string | undefined;
}): string {
  if (!address) return "";

  const parts: string[] = [];

  // Street number
  if (address.numeroVoie) {
    parts.push(address.numeroVoie);
  }

  // Street type (expanded from abbreviation)
  if (address.typeVoie) {
    const expandedType = expandStreetType(address.typeVoie);
    parts.push(expandedType.toLowerCase()); // Keep lowercase for French conventions
  }

  // Street name
  if (address.libelleVoie) {
    parts.push(formatStreetName(address.libelleVoie));
  }

  const streetPart = parts.join(" ");

  // Add postal code and city
  const locationParts: string[] = [];
  if (address.codePostal) {
    locationParts.push(address.codePostal);
  }
  if (address.commune) {
    locationParts.push(toTitleCase(address.commune));
  }

  if (locationParts.length > 0) {
    return `${streetPart}, ${locationParts.join(" ")}`;
  }

  return streetPart;
}

/**
 * Formats a street name with proper French capitalization
 */
function formatStreetName(streetName: string): string {
  if (!streetName) return "";

  return streetName
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
 * Converts a string to Title Case
 */
function toTitleCase(str: string): string {
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
 * Validates that an address type mapping exists
 */
export function isValidAddressType(abbreviation: string): boolean {
  const normalized = abbreviation?.trim().toUpperCase();
  return normalized in addressTypeMappings;
}

/**
 * Gets all available address type mappings
 */
export function getAddressTypeMappings(): AddressTypeMapping {
  return addressTypeMappings;
}
