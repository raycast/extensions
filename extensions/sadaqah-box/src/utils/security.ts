/**
 * Security utilities
 * Provides secure ID generation and input sanitization
 */

import { randomUUID } from "crypto";

/**
 * Generate a cryptographically secure unique ID
 * Replaces insecure Math.random() based generation
 */
export function generateSecureId(): string {
  return randomUUID();
}

/**
 * Sanitize user input to prevent XSS
 * Removes potentially dangerous HTML/script tags
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "") // Remove < and > characters
    .replace(/javascript:/gi, "") // Remove javascript: protocol
    .replace(/on\w+=/gi, ""); // Remove event handlers
}

/**
 * Check if a string contains only safe characters
 */
export function isSafeString(input: string): boolean {
  // Allow alphanumeric, spaces, and common punctuation
  const safePattern = /^[\w\s\-_.@#$%^&*()+=\]{}[|;:'",<>?/~`!]*$/u;
  return safePattern.test(input);
}

/**
 * Validate and sanitize URL
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return parsed.toString().replace(/\/$/, ""); // Remove trailing slash
  } catch {
    throw new Error("Invalid URL format");
  }
}
