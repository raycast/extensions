/**
 * IOC Detection Utilities
 *
 * Detects and validates various types of Indicators of Compromise (IOCs)
 */

import { IOCType, HashType, IOCDetectionResult } from "../types";

/**
 * Normalize potentially defanged IOCs into a canonical form for detection.
 *
 * This is non-destructive for already-fanged values and only targets
 * common defanging patterns used in reports and chats.
 */
export function normalizeIOC(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  return (
    trimmed
      // Handle common protocol defanging
      .replace(/^hxxp:\/\//i, "http://")
      .replace(/^hxxps:\/\//i, "https://")
      // Handle dot defanging variations
      .replace(/\[\.]/gi, ".")
      .replace(/\(\.\)/g, ".")
      .replace(/\s*\.\s*/g, ".")
      // Remove zero-width and similar sneaky characters around dots and colons
      .replace(/[\u200B-\u200D\uFEFF]+/g, "")
      // Handle colon defanging
      .replace(/\[:]/g, ":")
      // Handle email defanging
      .replace(/\[@]/g, "@")
  );
}

/**
 * Detect the type of IOC from a given string
 */
export function detectIOCType(value: string): IOCDetectionResult {
  const normalizedValue = normalizeIOC(value);
  const trimmedValue = normalizedValue.trim();

  // Check for hash (MD5, SHA1, SHA256)
  const hashResult = detectHash(trimmedValue);
  if (hashResult.isValid) {
    return hashResult;
  }

  // Check for URL
  if (isURL(trimmedValue)) {
    return {
      type: "url",
      value: trimmedValue,
      isValid: true,
      confidence: 0.95,
    };
  }

  // Check for IPv6
  if (isIPv6(trimmedValue)) {
    return {
      type: "ipv6",
      value: trimmedValue,
      isValid: true,
      confidence: 0.9,
    };
  }

  // Check for IPv4
  if (isIPv4(trimmedValue)) {
    return {
      type: "ip",
      value: trimmedValue,
      isValid: true,
      confidence: 0.95,
    };
  }

  // Check for email
  if (isEmail(trimmedValue)) {
    return {
      type: "email",
      value: trimmedValue,
      isValid: true,
      confidence: 0.85,
    };
  }

  // Check for domain (do this last as it's the most lenient)
  if (isDomain(trimmedValue)) {
    return {
      type: "domain",
      value: trimmedValue.toLowerCase(),
      isValid: true,
      confidence: 0.8,
    };
  }

  return {
    type: "unknown",
    value: trimmedValue,
    isValid: false,
    confidence: 0,
  };
}

/**
 * Detect hash type (MD5, SHA1, SHA256)
 */
export function detectHash(value: string): IOCDetectionResult {
  const hexPattern = /^[a-fA-F0-9]+$/;

  if (!hexPattern.test(value)) {
    return {
      type: "hash",
      value,
      isValid: false,
      confidence: 0,
    };
  }

  const length = value.length;
  let hashType: HashType = "unknown";
  let confidence = 0;

  if (length === 32) {
    hashType = "md5";
    confidence = 1.0;
  } else if (length === 40) {
    hashType = "sha1";
    confidence = 1.0;
  } else if (length === 64) {
    hashType = "sha256";
    confidence = 1.0;
  }

  if (hashType !== "unknown") {
    return {
      type: "hash",
      value: value.toLowerCase(),
      hashType,
      isValid: true,
      confidence,
    };
  }

  return {
    type: "hash",
    value,
    hashType: "unknown",
    isValid: false,
    confidence: 0,
  };
}

/**
 * Validate IPv4 address
 */
export function isIPv4(value: string): boolean {
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;

  if (!ipv4Pattern.test(value)) {
    return false;
  }

  const octets = value.split(".");
  return octets.every((octet) => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255 && octet === String(num);
  });
}

/**
 * Validate IPv6 address
 */
export function isIPv6(value: string): boolean {
  // Simplified IPv6 validation - handles most common cases
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  const ipv6WithIPv4Pattern = /^([0-9a-fA-F]{0,4}:){2,6}(\d{1,3}\.){3}\d{1,3}$/;

  return ipv6Pattern.test(value) || ipv6WithIPv4Pattern.test(value);
}

/**
 * Validate domain name
 */
export function isDomain(value: string): boolean {
  // Basic domain validation
  const domainPattern =
    /^([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

  if (!domainPattern.test(value)) {
    return false;
  }

  // Check length constraints
  if (value.length > 253) {
    return false;
  }

  // Check label lengths
  const labels = value.split(".");
  return labels.every((label) => label.length <= 63 && label.length > 0);
}

/**
 * Validate URL
 */
export function isURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate email address
 */
export function isEmail(value: string): boolean {
  const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailPattern.test(value);
}

/**
 * Defang an IOC (make it safe for sharing)
 */
export function defangIOC(value: string, type: IOCType): string {
  switch (type) {
    case "url":
      return value
        .replace(/^https?:\/\//i, (match) => match.replace(/t/gi, "x"))
        .replace(/\./g, "[.]");
    case "domain":
    case "email":
      return value.replace(/\./g, "[.]").replace(/@/g, "[@]");
    case "ip":
    case "ipv6":
      return value.replace(/\./g, "[.]").replace(/:/g, "[:]");
    default:
      return value;
  }
}

/**
 * Refang an IOC (restore to original form)
 */
export function refangIOC(value: string): string {
  return value
    .replace(/\[\.\]/g, ".")
    .replace(/\[:\]/g, ":")
    .replace(/\[@\]/g, "@")
    .replace(/hxxp/gi, "http")
    .replace(/hxxps/gi, "https");
}

/**
 * Extract IOC-like strings from an arbitrary text blob using regexes.
 *
 * This is intentionally permissive: we let detectIOCType do the strict validation.
 */
export function extractIOCStrings(blob: string): string[] {
  const results = new Set<string>();

  if (!blob.trim()) {
    return [];
  }

  const text = blob;

  // URLs (http/https)
  const urlRegex = /https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+/gi;
  for (const match of text.matchAll(urlRegex)) {
    results.add(match[0]);
  }

  // IPv4
  const ipv4Regex = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  for (const match of text.matchAll(ipv4Regex)) {
    results.add(match[0]);
  }

  // IPv6 (very loose, detectIOCType will validate)
  const ipv6Regex = /\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g;
  for (const match of text.matchAll(ipv6Regex)) {
    results.add(match[0]);
  }

  // Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  for (const match of text.matchAll(emailRegex)) {
    results.add(match[0]);
  }

  // Domains (rough: something.tld) – exclude things already captured as URLs/emails
  const domainRegex = /\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  for (const match of text.matchAll(domainRegex)) {
    results.add(match[0]);
  }

  // Hashes: MD5 (32), SHA1 (40), SHA256 (64) hex
  const hashRegex =
    /\b[a-fA-F0-9]{32}\b|\b[a-fA-F0-9]{40}\b|\b[a-fA-F0-9]{64}\b/g;
  for (const match of text.matchAll(hashRegex)) {
    results.add(match[0]);
  }

  return Array.from(results);
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    // Try to extract domain using regex if URL parsing fails
    const match = url.match(/^(?:https?:\/\/)?([^/\s:]+)/i);
    return match ? match[1] : null;
  }
}

/**
 * Generate SHA256 hash of a string (for VT URL lookups)
 */
export async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await (
    globalThis as unknown as {
      crypto: {
        subtle: {
          digest: (algorithm: string, data: Uint8Array) => Promise<ArrayBuffer>;
        };
      };
    }
  ).crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
