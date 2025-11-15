import * as yaml from "js-yaml";

export function detectFormat(input: string): "json" | "yaml" {
  const trimmed = input.trim();

  // JSON detection: starts with { or [
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    // Try to parse as JSON
    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      // If JSON parsing fails, might be YAML
    }
  }

  // YAML detection: try parsing as YAML
  try {
    yaml.load(trimmed);
    return "yaml";
  } catch {
    // If both fail, default to JSON for error handling
    return "json";
  }
}

export function validateInput(
  input: string,
  format: "json" | "yaml" | "auto",
): { valid: boolean; error?: string; detectedFormat?: "json" | "yaml" } {
  if (!input || input.trim().length === 0) {
    return { valid: false, error: "Input cannot be empty" };
  }

  const detectedFormat = format === "auto" ? detectFormat(input) : format;

  try {
    if (detectedFormat === "json") {
      JSON.parse(input);
    } else {
      yaml.load(input);
    }
    return { valid: true, detectedFormat };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Invalid input format",
      detectedFormat,
    };
  }
}
