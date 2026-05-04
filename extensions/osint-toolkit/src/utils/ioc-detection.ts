/**
 * IOC Detection Utilities
 *
 * Detects and validates various types of Indicators of Compromise (IOCs)
 */

import { IOCType, HashType, IOCDetectionResult } from "../types";
import * as net from "net";

/**
 * Detect the type of IOC from a given string
 */
export function detectIOCType(value: string): IOCDetectionResult {
  const trimmedValue = value.trim();

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

  // Check for domain (do this last as it's the most lenient)
  const normalizedDomain = normalizeDomain(trimmedValue);
  if (isDomain(normalizedDomain)) {
    return {
      type: "domain",
      value: normalizedDomain.toLowerCase(),
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
 * Validate domain name
 */
function normalizeDomain(value: string): string {
  let v = value.trim();
  const portIndex = v.indexOf(":");
  if (portIndex !== -1) {
    const after = v.slice(portIndex + 1);
    if (/^\d+$/.test(after)) {
      v = v.slice(0, portIndex);
    }
  }
  if (v.endsWith(".")) {
    v = v.slice(0, -1);
  }
  return v;
}

export function isDomain(value: string): boolean {
  const normalized = normalizeDomain(value);
  if (normalized.length === 0 || normalized.length > 253) {
    return false;
  }

  // Must have at least one dot (single-label domains like "hello" are not valid)
  if (!normalized.includes(".")) {
    return false;
  }

  // Reject IP-like strings (dotted decimal/octal numbers)
  if (/^\d+(\.\d+){3}$/.test(normalized)) {
    return false;
  }

  const labels = normalized.split(".");
  const labelPattern = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

  for (const label of labels) {
    if (label.length < 1 || label.length > 63) return false;
    if (label.toLowerCase().startsWith("xn--")) {
      if (!/^xn--[a-z0-9-]+$/i.test(label)) return false;
    } else if (!labelPattern.test(label)) {
      return false;
    }
  }

  const tld = labels[labels.length - 1];
  if (tld.length < 2) return false;
  if (!/[a-z]/i.test(tld)) return false;

  return true;
}

/**
 * Validate IPv6 address
 */
export function isIPv6(value: string): boolean {
  return net.isIP(value) === 6;
}

/**
 * Validate IPv4 address
 */
export function isIPv4(value: string): boolean {
  return net.isIP(value) === 4;
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
 * Defang an IOC (make it safe for sharing)
 */
export function defangIOC(value: string, type: IOCType): string {
  switch (type) {
    case "url":
      return value
        .replace(/^https?:\/\//i, (match) => match.replace(/t/gi, "x"))
        .replace(/\./g, "[.]");
    case "domain":
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
    .replace(/hxxps/gi, "https")
    .replace(/hxxp/gi, "http");
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
