import { PatternDefinition } from "../types";
import { luhn, iban, vin, ssn } from "./validators";

export const patterns: PatternDefinition[] = [
  // SECRETS TIER
  {
    name: "JWT",
    pattern:
      /\beyJ[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)*\s*\.\s*eyJ[A-Za-z0-9_-]+(?:\s+[A-Za-z0-9_-]+)*\s*\.\s*[A-Za-z0-9_-]+/g,
    category: "secrets",
    description: "JSON Web Token",
  },
  {
    name: "AWS_ACCESS_KEY",
    pattern: /\bAKIA[0-9A-Z]{16}\b/g,
    category: "secrets",
    description: "AWS Access Key ID",
  },
  {
    name: "GITHUB_PAT",
    pattern: /\bghp_[A-Za-z0-9]{36}\b/g,
    category: "secrets",
    description: "GitHub Personal Access Token",
  },
  {
    name: "STRIPE_KEY",
    pattern: /\bsk_(?:live|test)_[A-Za-z0-9]{24,}\b/g,
    category: "secrets",
    description: "Stripe Secret Key",
  },
  {
    name: "GOOGLE_API_KEY",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    category: "secrets",
    description: "Google API Key",
  },
  {
    name: "PASSWORD_FIELD",
    pattern: /(?:password|pwd|pass)\s*[:=]\s*["']?([^"'\s]{8,})["']?/gi,
    category: "secrets",
    description: "Password in configuration",
  },
  {
    name: "DATABASE_URL",
    pattern: /(?:postgres(?:ql)?|mysql|mongodb):\/\/[^\s"']+/gi,
    category: "secrets",
    description: "Database connection string",
  },
  {
    name: "PRIVATE_KEY",
    pattern:
      /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g,
    category: "secrets",
    description: "PEM private key",
  },

  // PERSONAL TIER (BALANCED)
  {
    name: "EMAIL",
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    category: "personal",
    description: "Email address",
  },
  {
    name: "PHONE_US",
    pattern:
      /\b(?:\+1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
    category: "personal",
    description: "US phone number",
  },
  {
    name: "SSN",
    pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
    validator: ssn,
    category: "personal",
    description: "Social Security Number",
  },

  // FINANCIAL TIER (STANDARD)
  {
    name: "CREDIT_CARD",
    pattern:
      /\b(?:(?:4\d{3}|5[1-5]\d{2}|6(?:011|5\d{2}))(?:[- ]?\d{4}){3}|3[47]\d{2}[- ]?\d{6}[- ]?\d{5}|3\d{3}[- ]?\d{6}[- ]?\d{4}|4\d{12}(?:\d{3})?|5[1-5]\d{14}|3[47]\d{13}|3\d{13}|6(?:011|5\d{2})\d{12})\b/g,
    validator: luhn,
    category: "financial",
    description: "Credit card number",
  },
  {
    name: "IBAN",
    pattern:
      /\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?[\d\s]*\b/g,
    validator: iban,
    category: "financial",
    description: "International Bank Account Number",
  },
  {
    name: "SWIFT_BIC",
    pattern: /\b[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g,
    category: "financial",
    description: "SWIFT/BIC code",
  },
  {
    name: "BITCOIN_ADDRESS",
    pattern: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
    category: "financial",
    description: "Bitcoin address",
  },
  {
    name: "ETHEREUM_ADDRESS",
    pattern: /\b0x[a-fA-F0-9]{40}\b/g,
    category: "financial",
    description: "Ethereum address",
  },
  {
    name: "LITECOIN_ADDRESS",
    pattern: /\b[LM3][a-km-zA-HJ-NP-Z1-9]{26,33}\b/g,
    category: "financial",
    description: "Litecoin address",
  },
  {
    name: "MONERO_ADDRESS",
    pattern: /\b4[0-9AB][1-9A-HJ-NP-Za-km-z]{93}\b/g,
    category: "financial",
    description: "Monero address",
  },

  // NETWORK TIER (ENHANCED)
  {
    name: "IPV4",
    pattern:
      /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    category: "network",
    description: "IPv4 address",
  },
  {
    name: "IPV6",
    pattern: /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
    category: "network",
    description: "IPv6 address",
  },
  {
    name: "MAC_ADDRESS",
    pattern: /\b(?:[0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g,
    category: "network",
    description: "MAC address",
  },
  {
    name: "URL",
    pattern: /https?:\/\/[^\s"'<>]+/g,
    category: "network",
    description: "HTTP/HTTPS URL",
  },

  // SYSTEM TIER (ENHANCED)
  {
    name: "UUID",
    pattern:
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
    category: "system",
    description: "UUID/GUID",
  },
  {
    name: "UNIX_PATH",
    pattern: /\/[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)+/g,
    category: "system",
    description: "Unix file path",
  },
  {
    name: "WINDOWS_PATH",
    pattern: /[A-Z]:\\(?:[^\\/:*?"<>|\r\n]+\\)*[^\\/:*?"<>|\r\n]*/g,
    category: "system",
    description: "Windows file path",
  },
  {
    name: "VIN",
    pattern: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
    validator: vin,
    category: "system",
    description: "Vehicle Identification Number",
  },
];
