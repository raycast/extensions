/**
 * API response validation and change detection
 * Ensures API responses match expected structure and detects changes
 */

import { CompanyData } from "../types";

// Utility types for validation functions
type ApiObject = Record<string, unknown>;

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingFields: string[];
  unexpectedFields: string[];
}

export interface ApiChangeDetection {
  structureChanged: boolean;
  newFields: string[];
  removedFields: string[];
  typeChanges: string[];
  riskLevel: "low" | "medium" | "high";
}

/**
 * Expected structure for INPI API responses (kept for reference, not used at runtime)
 */
/* const EXPECTED_STRUCTURE = {
  formality: {
    required: true,
    type: "object",
    fields: {
      siren: { required: true, type: "string" },
      content: {
        required: true,
        type: "object",
        oneOf: ["personneMorale", "personnePhysique"],
      },
    },
  },
}; */

/**
 * Validates INPI API response structure
 */
export function validateCompanyDataStructure(data: CompanyData): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    missingFields: [],
    unexpectedFields: [],
  };

  if (!data || typeof data !== "object") {
    result.valid = false;
    result.errors.push("Response is not an object");
    return result;
  }

  // Check required root fields
  if (!data.formality) {
    result.valid = false;
    result.errors.push("Missing required field: formality");
    result.missingFields.push("formality");
  } else {
    validateFormalityStructure(data.formality, result);
  }

  return result;
}

/**
 * Validates the formality section structure
 */
function validateFormalityStructure(formality: CompanyData["formality"], result: ValidationResult): void {
  if (!formality || typeof formality !== "object") {
    result.valid = false;
    result.errors.push("formality is not an object");
    return;
  }

  // Check SIREN
  if (!formality.siren) {
    result.valid = false;
    result.errors.push("Missing required field: formality.siren");
    result.missingFields.push("formality.siren");
  } else if (typeof formality.siren !== "string") {
    result.errors.push("formality.siren should be string");
  } else if (!/^\d{9}$/.test(formality.siren)) {
    result.warnings.push("formality.siren is not 9 digits");
  }

  // Check content
  if (!formality.content) {
    result.valid = false;
    result.errors.push("Missing required field: formality.content");
    result.missingFields.push("formality.content");
    return;
  }

  validateContentStructure(formality.content, result);
}

/**
 * Validates the content section structure
 */
function validateContentStructure(content: ApiObject, result: ValidationResult): void {
  if (!content || typeof content !== "object") {
    result.valid = false;
    result.errors.push("formality.content is not an object");
    return;
  }

  const hasPersonneMorale = content.personneMorale;
  const hasPersonnePhysique = content.personnePhysique;

  if (!hasPersonneMorale && !hasPersonnePhysique) {
    result.valid = false;
    result.errors.push("Missing both personneMorale and personnePhysique");
    result.missingFields.push("formality.content.personneMorale", "formality.content.personnePhysique");
    return;
  }

  if (hasPersonneMorale && hasPersonnePhysique) {
    result.warnings.push("Both personneMorale and personnePhysique present (unusual)");
  }

  if (hasPersonneMorale) {
    validatePersonneMoraleStructure(content.personneMorale as ApiObject, result);
  }

  if (hasPersonnePhysique) {
    validatePersonnePhysiqueStructure(content.personnePhysique as ApiObject, result);
  }
}

/**
 * Validates PersonneMorale structure
 */
function validatePersonneMoraleStructure(personneMorale: ApiObject, result: ValidationResult): void {
  if (!personneMorale || typeof personneMorale !== "object") {
    result.errors.push("personneMorale is not an object");
    return;
  }

  // Check for essential fields
  const essentialFields = ["denomination", "adresseEntreprise"];

  essentialFields.forEach((field) => {
    if (!personneMorale[field]) {
      result.warnings.push(`Missing recommended field: personneMorale.${field}`);
    }
  });

  // Validate address structure if present
  if (personneMorale.adresseEntreprise) {
    validateAddressStructure(personneMorale.adresseEntreprise as ApiObject, "personneMorale.adresseEntreprise", result);
  }

  // Validate composition for representatives
  if (personneMorale.composition) {
    validateCompositionStructure(personneMorale.composition as ApiObject, result);
  }
}

/**
 * Validates PersonnePhysique structure
 */
function validatePersonnePhysiqueStructure(personnePhysique: ApiObject, result: ValidationResult): void {
  if (!personnePhysique || typeof personnePhysique !== "object") {
    result.errors.push("personnePhysique is not an object");
    return;
  }

  // Check for identité structure
  if (personnePhysique.identite) {
    const identite = personnePhysique.identite as ApiObject;
    if (identite.entrepreneur) {
      const entrepreneur = identite.entrepreneur as ApiObject;
      const desc = entrepreneur.descriptionPersonne;
      if (!desc) {
        result.warnings.push("Missing entrepreneur description");
      }
    }
  }
}

/**
 * Validates address structure
 */
function validateAddressStructure(address: ApiObject, path: string, result: ValidationResult): void {
  if (!address || typeof address !== "object") {
    result.warnings.push(`${path} is not an object`);
    return;
  }

  if (address.adresse) {
    const addr = address.adresse as ApiObject;
    const expectedAddressFields = ["codePostal", "commune"];

    expectedAddressFields.forEach((field) => {
      if (!addr[field]) {
        result.warnings.push(`Missing address field: ${path}.adresse.${field}`);
      }
    });
  }
}

/**
 * Validates composition structure for representatives
 */
function validateCompositionStructure(composition: ApiObject, result: ValidationResult): void {
  if (!composition || typeof composition !== "object") {
    result.warnings.push("composition is not an object");
    return;
  }

  if (composition.pouvoirs) {
    if (!Array.isArray(composition.pouvoirs)) {
      result.warnings.push("composition.pouvoirs is not an array");
      return;
    }

    composition.pouvoirs.forEach((pouvoir: ApiObject, index: number) => {
      validatePouvoirStructure(pouvoir, index, result);
    });
  }
}

/**
 * Validates individual pouvoir (representative) structure
 */
function validatePouvoirStructure(pouvoir: ApiObject, index: number, result: ValidationResult): void {
  if (!pouvoir || typeof pouvoir !== "object") {
    result.warnings.push(`pouvoir[${index}] is not an object`);
    return;
  }

  // Check for either new or old API format
  const individu = pouvoir.individu as ApiObject;
  const personnePhysique = pouvoir.personnePhysique as ApiObject;
  const hasNewFormat = individu?.descriptionPersonne;
  const hasOldFormat = personnePhysique?.identite
    ? (personnePhysique.identite as ApiObject)?.descriptionPersonne
    : false;
  const hasEntreprise = pouvoir.entreprise;

  if (!hasNewFormat && !hasOldFormat && !hasEntreprise) {
    result.warnings.push(`pouvoir[${index}] missing representative data (individu, personnePhysique, or entreprise)`);
  }

  // Check role
  if (!pouvoir.roleEntreprise) {
    result.warnings.push(`pouvoir[${index}] missing roleEntreprise`);
  }
}

/**
 * Detects changes in API structure compared to baseline
 */
export function detectApiChanges(currentResponse: ApiObject, baselineResponse: ApiObject): ApiChangeDetection {
  const currentFields = extractFieldPaths(currentResponse);
  const baselineFields = extractFieldPaths(baselineResponse);

  const newFields = currentFields.filter((field) => !baselineFields.includes(field));
  const removedFields = baselineFields.filter((field) => !currentFields.includes(field));

  // Detect type changes
  const typeChanges: string[] = [];
  const commonFields = currentFields.filter((field) => baselineFields.includes(field));

  commonFields.forEach((fieldPath) => {
    const currentType = getFieldType(currentResponse, fieldPath);
    const baselineType = getFieldType(baselineResponse, fieldPath);

    if (currentType !== baselineType) {
      typeChanges.push(`${fieldPath}: ${baselineType} → ${currentType}`);
    }
  });

  // Assess risk level
  let riskLevel: "low" | "medium" | "high" = "low";

  if (removedFields.length > 0) {
    riskLevel = "high"; // Removed fields are critical
  } else if (typeChanges.length > 0) {
    riskLevel = "medium"; // Type changes can break parsing
  } else if (newFields.length > 0) {
    riskLevel = "low"; // New fields are usually safe
  }

  return {
    structureChanged: newFields.length > 0 || removedFields.length > 0 || typeChanges.length > 0,
    newFields,
    removedFields,
    typeChanges,
    riskLevel,
  };
}

/**
 * Extracts all field paths from an object
 */
function extractFieldPaths(obj: ApiObject, prefix: string = ""): string[] {
  const paths: string[] = [];

  if (!obj || typeof obj !== "object") {
    return paths;
  }

  Object.keys(obj).forEach((key) => {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    paths.push(fullPath);

    if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
      paths.push(...extractFieldPaths(obj[key] as ApiObject, fullPath));
    }
  });

  return paths;
}

/**
 * Gets the type of a field at a specific path
 */
function getFieldType(obj: ApiObject, path: string): string {
  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (!current || typeof current !== "object") {
      return "undefined";
    }
    current = (current as ApiObject)[part];
  }

  if (current === null) return "null";
  if (Array.isArray(current)) return "array";
  return typeof current;
}

/**
 * Creates a baseline from a valid API response for future comparisons
 */
export function createApiBaseline(response: CompanyData): ApiObject {
  // Create a simplified structure for comparison
  return {
    timestamp: Date.now(),
    structure: extractFieldPaths(response as unknown as ApiObject),
    types: extractFieldTypes(response as unknown as ApiObject),
    version: "1.0",
  };
}

/**
 * Extracts field types for baseline comparison
 */
function extractFieldTypes(obj: ApiObject, prefix: string = ""): Record<string, string> {
  const types: Record<string, string> = {};

  if (!obj || typeof obj !== "object") {
    return types;
  }

  Object.keys(obj).forEach((key) => {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (value === null) {
      types[fullPath] = "null";
    } else if (Array.isArray(value)) {
      types[fullPath] = "array";
    } else {
      types[fullPath] = typeof value;
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(types, extractFieldTypes(value as ApiObject, fullPath));
    }
  });

  return types;
}
