import { SOL } from "../constants/tokenAddress";
import { isValidSolanaAddress } from "./is-valid-address";

/**
 * Validates a number input string
 */
export function validateNumberInput(value: string | undefined, fieldName: string, minValue = 0): string | undefined {
  if (!value || value.trim() === "") {
    return `Please enter ${fieldName}`;
  }

  const num = parseFloat(value);
  if (isNaN(num) || num <= minValue) {
    return `Please enter a valid ${fieldName} greater than ${minValue}`;
  }

  return undefined;
}

/**
 * Validates an integer input string
 */
export function validateIntegerInput(value: string | undefined, fieldName: string, minValue = 1): string | undefined {
  if (!value || value.trim() === "") {
    return `Please enter ${fieldName}`;
  }

  const num = parseInt(value);
  if (isNaN(num) || num < minValue) {
    return `${fieldName} must be at least ${minValue}`;
  }

  return undefined;
}

/**
 * Validates a Solana address input
 */
export function validateTokenAddress(value: string | undefined, fieldName = "token address"): string | undefined {
  if (!value || value.trim() === "") {
    return `Please enter a valid ${fieldName}`;
  }

  if (!(isValidSolanaAddress(value) || value === SOL.address)) {
    return `Please enter a valid ${fieldName}`;
  }

  return undefined;
}

/**
 * Validates a required string input
 */
export function validateRequired(value: string | undefined, fieldName: string): string | undefined {
  if (!value || value.trim() === "") {
    return `Please enter ${fieldName}`;
  }

  return undefined;
}
