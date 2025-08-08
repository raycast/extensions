import { AddressInfo } from "./types";
import { readFile } from "fs/promises";
import { readFileSync } from "fs";
import { join } from "path";
import { environment } from "@raycast/api";

// Cache for role mappings to avoid repeated file reads
let roleMappings: { [key: string]: string } | null = null;
let roleMappingsLoadingPromise: Promise<{ [key: string]: string }> | null = null;

const FALLBACK_VALUE = "[[à compléter]]";

// User-friendly fallback values for different contexts
export const FALLBACK_VALUES = {
  MISSING_DATA: "[[à compléter]]",
  COMPANY_NAME: "[[Dénomination à compléter]]",
  ADDRESS: "[[Adresse à compléter]]",
  CAPITAL: "[[Montant à compléter]]",
  RCS_CITY: "[[Ville du greffe à compléter]]",
  REPRESENTATIVE_NAME: "[[Nom du représentant à compléter]]",
  REPRESENTATIVE_ROLE: "[[Fonction à compléter]]",
  BIRTH_DATE: "[[Date de naissance non renseignée]]",
  BIRTH_PLACE: "[[Lieu de naissance non renseigné]]",
  NATIONALITY: "[[Nationalité non renseignée]]",
} as const;

// Mapping des codes de forme juridique INPI vers les libellés complets
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
  const parts = [
    addr.complementLocalisation,
    addr.numVoie || addr.numeroVoie,
    addr.indiceRepetition,
    addr.typeVoie,
    addr.voie || addr.libelleVoie,
  ];

  const street = parts.filter(Boolean).join(" ");
  const city = `${formatField(addr.codePostal)} ${formatField(addr.commune)}`;

  if (!street && city.trim() === `${FALLBACK_VALUE} ${FALLBACK_VALUE}`) return FALLBACK_VALUE;

  return `${street}, ${city}`.trim();
}

export function getGenderAgreement(gender: "M" | "F" | "1" | "2" | null): string {
  if (gender === "M" || gender === "1") return "habilité";
  if (gender === "F" || gender === "2") return "habilitée";
  return "habilité(e)";
}

export function getLegalFormLabel(code: string): string {
  return LEGAL_FORM_MAPPING[code] || code;
}

export function formatSiren(siren: string): string {
  if (siren && siren.length === 9) {
    return `${siren.slice(0, 3)} ${siren.slice(3, 6)} ${siren.slice(6, 9)}`;
  }
  return siren;
}

/**
 * Loads role mappings from external configuration file asynchronously
 */
async function loadRoleMappingsAsync(): Promise<{ [key: string]: string }> {
  if (roleMappings !== null) {
    return roleMappings;
  }

  // If already loading, return the existing promise
  if (roleMappingsLoadingPromise !== null) {
    return roleMappingsLoadingPromise;
  }

  roleMappingsLoadingPromise = (async () => {
    try {
      // Try multiple possible paths for the role mappings file
      const possiblePaths = [
        join(environment.assetsPath, "role-mappings.json"),
        join(environment.assetsPath, "../src/config/role-mappings.json"),
        join(environment.assetsPath, "../../src/config/role-mappings.json"),
      ];

      let configPath: string | null = null;
      for (const path of possiblePaths) {
        try {
          if (readFileSync(path, "utf-8")) {
            configPath = path;
            break;
          }
        } catch {
          // Continue trying other paths
        }
      }

      if (!configPath) {
        throw new Error("Could not find role-mappings.json in any expected location");
      }
      const fileContent = await readFile(configPath, "utf-8");
      roleMappings = JSON.parse(fileContent);
      return roleMappings!;
    } catch (error) {
      console.error("Failed to load role mappings asynchronously:", error);
      // Reset loading promise on error to allow retry
      roleMappingsLoadingPromise = null;
      return {};
    }
  })();

  return roleMappingsLoadingPromise;
}

/**
 * Loads role mappings from external configuration file synchronously (fallback)
 */
function loadRoleMappingsSync(): { [key: string]: string } {
  if (roleMappings !== null) {
    return roleMappings;
  }

  try {
    // Try multiple possible paths for the role mappings file
    const possiblePaths = [
      join(environment.assetsPath, "role-mappings.json"),
      join(environment.assetsPath, "../src/config/role-mappings.json"),
      join(environment.assetsPath, "../../src/config/role-mappings.json"),
    ];

    let configPath: string | null = null;
    for (const path of possiblePaths) {
      try {
        if (readFileSync(path, "utf-8")) {
          configPath = path;
          break;
        }
      } catch {
        // Continue trying other paths
      }
    }

    if (!configPath) {
      console.error("Could not find role-mappings.json in any expected location");
      return {};
    }

    const fileContent = readFileSync(configPath, "utf-8");
    roleMappings = JSON.parse(fileContent);
    return roleMappings!;
  } catch (error) {
    console.error("Failed to load role mappings synchronously:", error);
    return {};
  }
}

/**
 * Maps role code to human-readable French role name
 */
export function getRoleName(roleCode: string): string {
  if (!roleCode || roleCode.trim() === "") {
    return FALLBACK_VALUES.REPRESENTATIVE_ROLE;
  }

  const mappings = loadRoleMappingsSync();
  const mappedRole = mappings[roleCode.trim()];

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
 * Maps role code to human-readable French role name asynchronously
 * Preferred method for better performance
 */
export async function getRoleNameAsync(roleCode: string): Promise<string> {
  if (!roleCode || roleCode.trim() === "") {
    return FALLBACK_VALUES.REPRESENTATIVE_ROLE;
  }

  const mappings = await loadRoleMappingsAsync();
  const mappedRole = mappings[roleCode.trim()];

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
 * Preloads role mappings to improve performance of subsequent lookups
 * Call this during application initialization
 */
export async function preloadRoleMappings(): Promise<void> {
  try {
    await loadRoleMappingsAsync();
    console.log("Role mappings preloaded successfully");
  } catch (error) {
    console.error("Failed to preload role mappings:", error);
  }
}
