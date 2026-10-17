/**
 * IOC Detection Utilities
 *
 * Detects and validates various types of Indicators of Compromise (IOCs)
 */

import { IOCType, HashType, IOCDetectionResult } from "../ioc-types";
import * as net from "net";
import { VALID_TLDS, RESERVED_TLDS } from "./tld-list";

/**
 * Detect the type of IOC from a given string
 */
export function detectIOCType(value: string): IOCDetectionResult {
  const trimmedValue = value.trim();

  // Handle email-shaped input ("user@example.com") by re-running detection
  // on the part after the last "@". URL-shaped input is left intact so
  // `https://...` still parses as a URL.
  if (trimmedValue.includes("@") && !trimmedValue.includes("://")) {
    const at = trimmedValue.lastIndexOf("@");
    const host = trimmedValue.slice(at + 1);
    return detectIOCType(host);
  }

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

  // Reject trivial hashes: all zeros, or every character identical
  // (e.g. "aaaa...a" of length 32/40/64). These are never real IOCs.
  if (/^0+$/.test(value) || /^(.)\1+$/.test(value)) {
    return {
      type: "hash",
      value,
      hashType: "unknown",
      isValid: false,
      confidence: 0,
    };
  }

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
  // Strip path/query/fragment first (before port, so `host:80/path` works).
  const cut = v.search(/[/?#]/);
  if (cut !== -1) {
    v = v.slice(0, cut);
  }
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

  // Reject TLDs that aren't in the IANA root zone (e.g. "b", "qx") and
  // RFC-reserved names (test, invalid, example, localhost, local).
  const tldLower = tld.toLowerCase();
  if (RESERVED_TLDS.has(tldLower)) return false;
  if (!VALID_TLDS.has(tldLower)) return false;

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
      return value.replace(/^https?:\/\//i, (match) => match.replace(/t/gi, "x")).replace(/\./g, "[.]");
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
