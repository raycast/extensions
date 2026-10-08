/**
 * Utilities for handling domain names and URLs
 */

// Regular expression for valid domain names
const DOMAIN_REGEX =
  /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

// Common protocols to strip
const PROTOCOL_REGEX = /^https?:\/\//i;

// Trailing slash and path components
const TRAILING_SLASH_REGEX = /\/.*$/;

/**
 * Sanitizes a URL input by removing protocol, paths, and normalizing format
 * @param input - Raw URL or domain input from user
 * @returns Clean domain name
 */
export function sanitizeDomain(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let domain = input.trim().toLowerCase();

  // Remove protocol (http://, https://)
  domain = domain.replace(PROTOCOL_REGEX, "");

  // Remove www. prefix (optional - some might want to keep it)
  domain = domain.replace(/^www\./, "");

  // Remove trailing slash and any path components
  domain = domain.replace(TRAILING_SLASH_REGEX, "");

  // Remove port numbers (e.g., example.com:8080)
  domain = domain.replace(/:\d+$/, "");

  return domain;
}

/**
 * Validates if a domain name is properly formatted
 * @param domain - Domain name to validate
 * @returns true if domain is valid
 */
export function isValidDomain(domain: string): boolean {
  if (!domain || typeof domain !== "string") {
    return false;
  }

  const cleanDomain = domain.trim();

  // Check basic format requirements
  if (cleanDomain.length === 0 || cleanDomain.length > 253) {
    return false;
  }

  // Check against regex pattern
  if (!DOMAIN_REGEX.test(cleanDomain)) {
    return false;
  }

  // Additional checks
  if (cleanDomain.startsWith(".") || cleanDomain.endsWith(".")) {
    return false;
  }

  // Check for consecutive dots
  if (cleanDomain.includes("..")) {
    return false;
  }

  // Must contain at least one dot (to be a valid domain)
  if (!cleanDomain.includes(".")) {
    return false;
  }

  return true;
}

/**
 * Processes user input to get a clean, valid domain
 * @param input - Raw user input
 * @returns Object with clean domain and validation status
 */
export function processDomainInput(input: string): {
  domain: string;
  isValid: boolean;
  error?: string;
} {
  const sanitized = sanitizeDomain(input);

  if (!sanitized) {
    return {
      domain: "",
      isValid: false,
      error: "Please enter a domain name",
    };
  }

  const isValid = isValidDomain(sanitized);

  if (!isValid) {
    return {
      domain: sanitized,
      isValid: false,
      error: "Please enter a valid domain name (e.g., example.com)",
    };
  }

  return {
    domain: sanitized,
    isValid: true,
  };
}

/**
 * Checks if a domain already exists in a list (case-insensitive)
 * @param domain - Domain to check
 * @param existingDomains - List of existing domains
 * @returns true if domain already exists
 */
export function isDuplicateDomain(
  domain: string,
  existingDomains: string[],
): boolean {
  if (!domain || !Array.isArray(existingDomains)) {
    return false;
  }

  const normalizedDomain = domain.toLowerCase().trim();
  return existingDomains.some(
    (existing) => existing.toLowerCase().trim() === normalizedDomain,
  );
}

/**
 * Formats domain for display purposes
 * @param domain - Domain to format
 * @returns Formatted domain string
 */
export function formatDomainForDisplay(domain: string): string {
  if (!domain) return "";
  return domain.trim().toLowerCase();
}
