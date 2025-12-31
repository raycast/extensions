import type { KibanaInstance, ValidationResult, Preferences } from "../types";

/**
 * Validate a single Kibana instance configuration
 */
export function validateInstance(
  instance: unknown,
  index: number,
): string | null {
  if (typeof instance !== "object" || instance === null) {
    return `Instance ${index + 1}: Must be an object`;
  }

  const inst = instance as Record<string, unknown>;

  // Check required fields
  if (!inst.name || typeof inst.name !== "string" || !inst.name.trim()) {
    return `Instance ${index + 1}: Missing or invalid "name" field`;
  }

  if (!inst.url || typeof inst.url !== "string" || !inst.url.trim()) {
    return `Instance ${index + 1} (${inst.name}): Missing or invalid "url" field`;
  }

  // Validate URL format
  try {
    new URL(inst.url as string);
  } catch {
    return `Instance ${index + 1} (${inst.name}): Invalid URL format`;
  }

  // Check authentication
  const hasApiKey = inst.apiKey && typeof inst.apiKey === "string";
  const hasBasicAuth =
    inst.username &&
    typeof inst.username === "string" &&
    inst.password &&
    typeof inst.password === "string";

  if (!hasApiKey && !hasBasicAuth) {
    return `Instance ${index + 1} (${inst.name}): Missing authentication. Provide either "apiKey" or both "username" and "password"`;
  }

  // Validate commonFields if present
  if (inst.commonFields !== undefined) {
    if (
      !Array.isArray(inst.commonFields) ||
      !inst.commonFields.every((f) => typeof f === "string")
    ) {
      return `Instance ${index + 1} (${inst.name}): "commonFields" must be an array of strings`;
    }
  }

  return null;
}

/**
 * Parse and validate instances from preferences
 */
export function parseInstances(prefs: Preferences): ValidationResult {
  if (!prefs.instancesJson || !prefs.instancesJson.trim()) {
    return {
      valid: false,
      error:
        "Configuration is empty. Please add Kibana instances in extension preferences.",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(prefs.instancesJson);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      valid: false,
      error: `Invalid JSON format: ${message}`,
    };
  }

  if (!Array.isArray(parsed)) {
    return {
      valid: false,
      error: "Configuration must be a JSON array of instances",
    };
  }

  if (parsed.length === 0) {
    return {
      valid: false,
      error: "Configuration array is empty. Please add at least one instance.",
    };
  }

  // Validate each instance
  for (let i = 0; i < parsed.length; i++) {
    const validationError = validateInstance(parsed[i], i);
    if (validationError) {
      return {
        valid: false,
        error: validationError,
      };
    }
  }

  // Check for duplicate instance names
  const names = parsed.map((inst) => (inst as KibanaInstance).name);
  const duplicates = names.filter(
    (name, index) => names.indexOf(name) !== index,
  );
  if (duplicates.length > 0) {
    return {
      valid: false,
      error: `Duplicate instance names found: ${duplicates.join(", ")}`,
    };
  }

  return {
    valid: true,
    instances: parsed as KibanaInstance[],
  };
}
