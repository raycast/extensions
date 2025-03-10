import { showFailureToast } from "@raycast/utils";

/**
 * Sanitize API endpoint by removing trailing spaces and ensuring proper format
 */
export function sanitizeEndpoint(endpoint: string): string {
  // Remove leading and trailing spaces
  let sanitized = endpoint.trim();

  // Remove trailing slash if it exists
  if (sanitized.endsWith("/")) {
    sanitized = sanitized.slice(0, -1);
  }

  return sanitized;
}

/**
 * Parse inputs from comma-separated or space-separated values
 */
export function parseInputVariables(inputText: string): Record<string, string> {
  const parsedInputs: Record<string, string> = {};

  if (inputText && inputText.trim().length > 0) {
    // First try to split by comma (both English and Chinese commas)
    const trimmedText = inputText.trim();
    let inputFields: string[];

    if (trimmedText.match(/[,，]/)) {
      // If commas are present, split by them
      inputFields = trimmedText.split(/[,，]/).map((field) => field.trim());
    } else {
      // If no commas, treat each word as a separate field
      inputFields = trimmedText.split(/\s+/);
    }

    // Create an object with each field as a key with empty string value
    inputFields.forEach((field) => {
      if (field) {
        parsedInputs[field] = "";
      }
    });
  }

  return parsedInputs;
}

/**
 * Format input variables for display
 */
export function formatInputVariables(inputs: Record<string, unknown> | undefined): string {
  if (!inputs || Object.keys(inputs).length === 0) {
    return "No input parameters defined";
  }

  // For comma-separated input format, just show the keys
  return Object.keys(inputs).join(", ");
}

/**
 * Handle and display error
 */
export async function handleError(error: unknown, title = "Error"): Promise<void> {
  console.error(title, error);
  // Pass title as object property to fix type error
  await showFailureToast({
    title,
    message: error instanceof Error ? error.message : String(error),
  });
}

/**
 * Validate form field and set error
 */
export function validateField(
  value: string,
  setError: (error: string | undefined) => void,
  errorMessage: string,
): boolean {
  if (!value.trim()) {
    setError(errorMessage);
    return false;
  }
  setError(undefined);
  return true;
}
