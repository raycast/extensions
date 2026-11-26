/**
 * Security utilities
 * Provides secure ID generation and URL validation
 */

import { randomUUID } from "crypto";

/**
 * Generate a cryptographically secure unique ID
 */
export function generateSecureId(): string {
  return randomUUID();
}

/**
 * Validate and sanitize URL to allow only HTTP(S) protocols
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    throw new Error("Invalid API Host URL format. Please check your extension preferences.");
  }
}
