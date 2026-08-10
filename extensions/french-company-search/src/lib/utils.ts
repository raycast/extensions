import { AddressInfo } from "../types";
import { environment } from "@raycast/api";
import roleMappings from "../../assets/role-mappings.json";
import { expandStreetType } from "./address-formatter";
import { toTitleCase } from "./formatting";

const FALLBACK_VALUE = "[[to be completed]]";

// User-friendly fallback values for different contexts
export const FALLBACK_VALUES = {
  MISSING_DATA: "[[to be completed]]",
  COMPANY_NAME: "[[Company name to be completed]]",
  ADDRESS: "[[Address to be completed]]",
  CAPITAL: "[[Amount to be completed]]",
  RCS_CITY: "[[Registry city to be completed]]",
  REPRESENTATIVE_NAME: "[[Representative name to be completed]]",
  REPRESENTATIVE_ROLE: "[[Position to be completed]]",
  BIRTH_DATE: "[[Birth date not provided]]",
  BIRTH_PLACE: "[[Birth place not provided]]",
  NATIONALITY: "[[Nationality not provided]]",
};

// Mapping of INPI legal form codes to complete labels
const LEGAL_FORM_MAPPING: { [key: string]: string } = {
  "1000": "Entrepreneur individuel",
  "2110": "Indivision entre personnes physiques",
  "2120": "Indivision avec personne morale",
  "2210": "Société créée de fait entre personnes physiques",
  "2220": "Société créée de fait avec personne morale",
  "5101": "Société de droit étranger",
  "5202": "Société à responsabilité limitée (SARL)",
  "5306": "Société anonyme à conseil d'administration (SA)",
  "5307": "Société anonyme à directoire (SA)",
  "5308": "Société anonyme à conseil d'administration (SA)",
  "5370": "Société par actions simplifiée (SAS)",
  "5385": "Société d'exercice libéral à responsabilité limitée (SELARL)",
  "5410": "SARL nationale",
  "5415": "SARL d'économie mixte",
  "5426": "SARL immobilière pour le commerce et l'industrie (SICOMI)",
  "5430": "SARL immobilière de gestion",
  "5442": "SARL de presse",
  "5455": "SARL coopérative de consommation",
  "5458": "SARL coopérative artisanale",
  "5459": "SARL coopérative d'intérêt maritime",
  "5460": "SARL coopérative de transport",
  "5471": "SARL d'intérêt collectif agricole (SICA)",
  "5485": "Société d'exercice libéral à responsabilité limitée",
  "5499": "Société à responsabilité limitée (SARL)",
  "5505": "Société civile de moyens (SCM)",
  "5510": "Société civile professionnelle (SCP)",
  "5520": "Société en nom collectif (SNC)",
  "5530": "Société en commandite simple (SCS)",
  "5540": "Société en commandite par actions (SCA)",
  "5560": "Société à responsabilité limitée (SARL)",
  "5570": "Société en commandite par actions (SCA)",
  "5598": "Société anonyme (SA)",
  "5599": "Société anonyme (SA)",
  "5601": "SA à directoire (s.a.i.)",
  "5602": "SA à conseil d'administration (s.a.i.)",
  "5710": "Société par actions simplifiée (SAS)",
  "5720": "Société par actions simplifiée à associé unique (SASU)",
  "5800": "Groupement d'intérêt économique (GIE)",
  "6100": "Caisse d'épargne et de prévoyance",
  "6210": "Groupement européen d'intérêt économique (GEIE)",
  "6220": "Société coopérative européenne",
  "6532": "Société civile laitière",
  "6533": "Société civile de placement collectif immobilier (SCPI)",
  "6534": "Société civile d'attribution",
  "6535": "Société civile coopérative de construction",
  "6536": "Société civile d'intérêt collectif agricole (SICA)",
  "6538": "Société civile coopérative de consommation",
  "6539": "Société civile coopérative d'intérêt maritime",
  "6540": "Société civile d'exploitation agricole",
  "6558": "Société civile coopérative (autre)",
  "6561": "Société civile professionnelle (SCP)",
  "6585": "Société civile de moyens (SCM)",
  "6588": "Groupement foncier agricole (GFA)",
  "6589": "Groupement agricole d'exploitation en commun (GAEC)",
  "6595": "Groupement forestier",
  "6596": "Groupement pastoral",
  "6597": "Groupement d'employeurs",
  "6598": "Groupement foncier rural",
  "6901": "Autre personne morale de droit privé",
  "7111": "Syndicat de propriétaires",
  "7112": "Syndicat de copropriété",
  "7151": "Association non déclarée",
  "7152": "Association déclarée",
  "7153": "Association déclarée d'utilité publique",
  "7210": "Syndicat de salariés",
  "7220": "Syndicat patronal",
  "7321": "Comité d'entreprise",
  "7322": "Comité central d'entreprise",
  "7323": "Comité d'établissement",
  "7351": "Congrégation",
  "7352": "Association diocésaine",
  "7353": "Etablissement du culte",
  "7361": "Fondation",
  "7362": "Fondation d'entreprise",
  "7363": "Fondation de coopération scientifique",
  "7381": "Mutuelle",
  "7382": "Union de mutuelles",
  "7383": "Mutuelle d'assurance",
  "7384": "Mutuelle de retraite",
  "7385": "Mutuelle de prévoyance",
  "8110": "Régie d'une collectivité locale",
  "8120": "Etablissement public national à caractère industriel ou commercial",
  "8130": "Etablissement public national à caractère administratif",
  "8210": "Etablissement public local à caractère industriel ou commercial",
  "8220": "Etablissement public local à caractère administratif",
  "8310": "Caisse nationale de sécurité sociale",
  "8311": "Caisse de mutualité sociale agricole",
  "8312": "Caisse (régime spécial de sécurité sociale)",
  "8320": "Caisse de retraite complémentaire",
  "8330": "Organisme d'assurance chômage",
  "8410": "Organisme de sécurité sociale du régime général",
  "9110": "Personne morale de droit public soumise au droit commercial",
  "9150": "Personne morale de droit étranger",
  "9210": "Société européenne",
  "9220": "Société coopérative européenne",
  "9300": "Groupement européen d'intérêt économique (GEIE)",
  "9900": "Autre personne morale de droit privé",
};

export function validateAndExtractSiren(input: string): string | null {
  const cleanedInput = input.replace(/\s/g, "");
  if (/^\d{9}$/.test(cleanedInput)) {
    return cleanedInput;
  }
  if (/^\d{14}$/.test(cleanedInput)) {
    return cleanedInput.substring(0, 9);
  }
  return null;
}

export function formatField<T>(value: T | null | undefined, fallback = FALLBACK_VALUE): string {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  return String(value);
}

export function formatAddress(address: AddressInfo): string {
  if (!address || !address.adresse) return FALLBACK_VALUE;

  const addr = address.adresse;

  // Build street part with expanded type
  const streetParts = [addr.complementLocalisation, addr.numVoie || addr.numeroVoie, addr.indiceRepetition].filter(
    Boolean,
  );

  // Expand street type (BD → Boulevard, AV → Avenue, etc.)
  if (addr.typeVoie) {
    const expandedType = expandStreetType(addr.typeVoie);
    streetParts.push(expandedType.toLowerCase()); // Keep lowercase for French conventions
  }

  // Add street name
  if (addr.voie || addr.libelleVoie) {
    const streetName = toTitleCase(addr.voie || addr.libelleVoie || "");
    streetParts.push(streetName);
  }

  const street = streetParts.join(" ");

  // Format city with proper capitalization
  const formattedCity = addr.commune ? toTitleCase(addr.commune) : FALLBACK_VALUE;
  const city = `${formatField(addr.codePostal)} ${formattedCity}`;

  if (!street && city.trim() === `${FALLBACK_VALUE} ${FALLBACK_VALUE}`) return FALLBACK_VALUE;

  return `${street}, ${city}`.trim();
}

export function getGenderAgreement(gender: string | null): string {
  if (gender === "M" || gender === "1") return "habilité";
  if (gender === "F" || gender === "2") return "habilitée";
  return "habilité(e)";
}

export function getLegalFormLabel(code: string): string {
  return LEGAL_FORM_MAPPING[code] || code;
}

export function formatSiren(siren: string): string {
  if (siren && siren.length === 9) {
    return `${siren.slice(0, 3)}\u00A0${siren.slice(3, 6)}\u00A0${siren.slice(6, 9)}`;
  }
  return siren;
}

/**
 * Formats a number with French formatting (spaces for thousands, comma for decimals)
 * Examples:
 * - 9077707050 -> "9 077 707 050,00"
 * - 675.2 -> "675,20"
 * - 1234.56 -> "1 234,56"
 * - "675,2" -> "675,20"
 */
export function formatFrenchNumber(value: string | number): string {
  if (!value) return value as string;

  // Convert to string and normalize decimal separators (. or ,)
  const numString = value.toString().replace(/\s/g, "").replace(",", ".");

  // Check if it's a valid number (integer or decimal)
  if (!/^\d+(\.\d+)?$/.test(numString)) {
    return value as string;
  }

  // Parse the number to handle decimals properly
  const num = parseFloat(numString);

  // Format to ensure exactly 2 decimal places
  const formatted = num.toFixed(2);
  const parts = formatted.split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add non-breaking spaces every 3 digits from right to left for integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");

  // Return with French decimal separator (comma) and exactly 2 decimal places
  return `${formattedInteger},${decimalPart}`;
}

/**
 * Maps a role code to its human-readable French name using the statically imported mapping.
 * This function is synchronous and performant.
 *
 * @param roleCode The role code from the API.
 * @returns The mapped role name or a fallback string.
 */
export function getRoleName(roleCode: string): string {
  if (!roleCode || roleCode.trim() === "") {
    return FALLBACK_VALUES.REPRESENTATIVE_ROLE;
  }

  const mappedRole = (roleMappings as { [key: string]: string })[roleCode.trim()];

  if (mappedRole) {
    return mappedRole;
  }

  // If we have a numeric code but no mapping, provide a helpful fallback
  if (/^\d+$/.test(roleCode.trim())) {
    return `[[Fonction code ${roleCode} - Mapping à ajouter]]`;
  }

  return FALLBACK_VALUES.REPRESENTATIVE_ROLE;
}

/**
 * Asynchronously maps a role code to its human-readable French name.
 * @deprecated This function is now synchronous under the hood. Use getRoleName instead.
 * @param roleCode The role code to look up.
 * @returns A promise that resolves to the role name.
 */
export async function getRoleNameAsync(roleCode: string): Promise<string> {
  return Promise.resolve(getRoleName(roleCode));
}

/**
 * Preloads role mappings. This function is now a no-op for backward compatibility
 * as the data is loaded at build time.
 */
export async function preloadRoleMappings(): Promise<void> {
  if (environment.isDevelopment) {
    console.log("Role mappings are now statically imported. Preloading is no longer necessary.");
  }
  return Promise.resolve();
}
