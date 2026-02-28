/**
 * Input validation utilities for forms.
 *
 * Pure functions that validate user input and return error messages.
 * Return `undefined` when input is valid, or a string error message when invalid.
 *
 * Used by AccountForm, EditPositionForm, and AddPositionForm components.
 */

// ──────────────────────────────────────────
// Validation Result Type
// ──────────────────────────────────────────

/** Undefined means valid; a string is the error message */
export type ValidationResult = string | undefined;

// ──────────────────────────────────────────
// Account Validation
// ──────────────────────────────────────────

/**
 * Validates an account name.
 *
 * Rules:
 * - Must not be empty or whitespace-only
 * - Must be between 1 and 50 characters (after trimming)
 *
 * @param name - The account name to validate
 * @returns Error message or undefined if valid
 *
 * @example
 * validateAccountName("")              // "Account name is required"
 * validateAccountName("   ")           // "Account name is required"
 * validateAccountName("A".repeat(51))  // "Account name must be 50 characters or fewer"
 * validateAccountName("Vanguard ISA")  // undefined (valid)
 */
export function validateAccountName(name: string | undefined): ValidationResult {
  const trimmed = (name ?? "").trim();

  if (trimmed.length === 0) {
    return "Account name is required";
  }

  if (trimmed.length > 50) {
    return "Account name must be 50 characters or fewer";
  }

  return undefined;
}

// ──────────────────────────────────────────
// Position / Units Validation
// ──────────────────────────────────────────

/**
 * Validates a units input string (from a text field).
 *
 * Rules:
 * - Must not be empty
 * - Must be a valid number
 * - Must be greater than zero
 * - Must not exceed a reasonable maximum (10 billion)
 * - Must not have more than 6 decimal places
 *
 * @param input - Raw string from the text input
 * @returns Error message or undefined if valid
 *
 * @example
 * validateUnits("")         // "Number of units is required"
 * validateUnits("abc")      // "Must be a valid number"
 * validateUnits("0")        // "Units must be greater than zero"
 * validateUnits("-5")       // "Units must be greater than zero"
 * validateUnits("12.5")     // undefined (valid)
 * validateUnits("0.000001") // undefined (valid)
 */
export function validateUnits(input: string | undefined): ValidationResult {
  const trimmed = (input ?? "").trim();

  if (trimmed.length === 0) {
    return "Number of units is required";
  }

  const value = Number(trimmed);

  if (isNaN(value) || !isFinite(value)) {
    return "Must be a valid number";
  }

  if (value <= 0) {
    return "Units must be greater than zero";
  }

  if (value > 10_000_000_000) {
    return "Units value seems too large — please check your input";
  }

  // Check decimal places
  const parts = trimmed.split(".");
  if (parts.length === 2 && parts[1].length > 6) {
    return "Maximum 6 decimal places allowed";
  }

  return undefined;
}

/**
 * Parses a validated units string to a number.
 * Should only be called after `validateUnits` returns undefined.
 *
 * @param input - Validated units string
 * @returns Parsed number
 */
export function parseUnits(input: string): number {
  return Number(input.trim());
}

// ──────────────────────────────────────────
// Symbol Validation
// ──────────────────────────────────────────

/**
 * Validates that a symbol has been selected (non-empty).
 * Used to ensure the user has picked a search result before proceeding.
 *
 * @param symbol - The Yahoo Finance symbol
 * @returns Error message or undefined if valid
 *
 * @example
 * validateSymbol("")       // "Please select an investment"
 * validateSymbol("VUSA.L") // undefined (valid)
 */
export function validateSymbol(symbol: string | undefined): ValidationResult {
  const trimmed = (symbol ?? "").trim();

  if (trimmed.length === 0) {
    return "Please select an investment";
  }

  return undefined;
}

// ──────────────────────────────────────────
// Generic Helpers
// ──────────────────────────────────────────

/**
 * Checks if a validation result represents a valid state.
 *
 * @param result - A validation result
 * @returns true if valid (result is undefined), false if invalid
 */
export function isValid(result: ValidationResult): boolean {
  return result === undefined;
}

/**
 * Runs multiple validation results and returns the first error found,
 * or undefined if all are valid.
 *
 * @param results - Array of validation results
 * @returns First error message found, or undefined if all valid
 *
 * @example
 * firstError([undefined, undefined])         // undefined
 * firstError([undefined, "Name is required"]) // "Name is required"
 */
export function firstError(...results: ValidationResult[]): ValidationResult {
  return results.find((r) => r !== undefined);
}

// ──────────────────────────────────────────
// Asset Name Validation
// ──────────────────────────────────────────

/**
 * Validates an asset display name.
 *
 * Rules:
 * - Must not be empty or whitespace-only
 * - Must be between 1 and 120 characters (after trimming)
 *
 * @param name - The asset name to validate
 * @returns Error message or undefined if valid
 */
export function validateAssetName(name: string | undefined): ValidationResult {
  const trimmed = (name ?? "").trim();

  if (trimmed.length === 0) {
    return "Asset name is required";
  }

  if (trimmed.length > 120) {
    return "Asset name must be 120 characters or fewer";
  }

  return undefined;
}

// ──────────────────────────────────────────
// Price Validation
// ──────────────────────────────────────────

/**
 * Validates a price input string (from a text field).
 *
 * Rules:
 * - Must not be empty
 * - Must be a valid number
 * - Must be greater than zero
 * - Must not exceed a reasonable maximum (10 billion)
 * - Must not have more than 6 decimal places
 *
 * @param input - Raw string from the text input
 * @returns Error message or undefined if valid
 */
export function validatePrice(input: string | undefined): ValidationResult {
  const trimmed = (input ?? "").trim();

  if (trimmed.length === 0) {
    return "Price is required";
  }

  const value = Number(trimmed);

  if (isNaN(value) || !isFinite(value)) {
    return "Must be a valid number";
  }

  if (value <= 0) {
    return "Price must be greater than zero";
  }

  if (value > 10_000_000_000) {
    return "Price seems too large — please check your input";
  }

  const parts = trimmed.split(".");
  if (parts.length === 2 && parts[1].length > 6) {
    return "Maximum 6 decimal places allowed";
  }

  return undefined;
}
