import { jwtDecode } from "jwt-decode";
import { verify } from "jsonwebtoken";
import { DecodedJWT, TokenDetails, ValidationResult, JWTHeader } from "./types";

/**
 * Check if a string is a valid JWT token
 */
export function isJWT(token: string): boolean {
  if (!token) return false;
  try {
    const parts = token.split(".");
    return parts.length === 3;
  } catch {
    return false;
  }
}

/**
 * Parse a JWT token into its components
 */
export function parseJWT(token: string): DecodedJWT {
  try {
    // First decode the header
    const header = jwtDecode(token, { header: true }) as JWTHeader;

    // Then decode the payload
    const payload = jwtDecode(token);

    // Get the signature
    const signature = token.split(".")[2];

    return {
      header,
      payload,
      signature,
    };
  } catch {
    throw new Error("Invalid JWT format");
  }
}

/**
 * Validate a JWT token using a secret key
 */
export function validateJWT(token: string, secret?: string): ValidationResult {
  if (!secret) {
    return { isValid: false, error: "No secret provided" };
  }

  try {
    verify(token, secret);
    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : "Invalid token",
    };
  }
}

/**
 * Format a timestamp into a readable date string
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Get complete token details including validation if a secret is provided
 */
export function getTokenDetails(token: string, secret?: string): TokenDetails {
  const decoded = parseJWT(token);
  const validation = secret ? validateJWT(token, secret) : undefined;

  return {
    ...decoded,
    validation,
  };
}
