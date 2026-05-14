/**
 * Utilities for redacting sensitive data before logging.
 *
 * Use these functions to prevent sensitive information (IBANs, amounts,
 * API keys, etc.) from appearing in logs.
 */

/**
 * Masks an IBAN, showing only the country code and last 4 digits.
 *
 * @example
 * maskIban("NL12BUNQ1234567890") // "NL12****7890"
 * maskIban("") // ""
 */
export function maskIban(iban: string | null | undefined): string {
  if (!iban) return "";
  const cleaned = iban.replace(/\s/g, "");
  if (cleaned.length <= 8) return "****";
  return `${cleaned.slice(0, 4)}****${cleaned.slice(-4)}`;
}

/**
 * Masks a monetary amount, replacing digits with asterisks.
 *
 * @example
 * maskAmount("123.45") // "***.**"
 * maskAmount("1000") // "****"
 */
export function maskAmount(amount: string | null | undefined): string {
  if (!amount) return "";
  return amount.replace(/\d/g, "*");
}

/**
 * Redacts sensitive fields from an object for safe logging.
 * Returns a new object with sensitive fields masked.
 *
 * @param data - The data to redact
 * @returns A copy with sensitive fields redacted
 */
export function redactSensitive(data: unknown): unknown {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSensitive(item));
  }

  const result: Record<string, unknown> = {};
  const obj = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    // Redact sensitive keys
    if (
      lowerKey.includes("iban") ||
      lowerKey.includes("account_number") ||
      lowerKey.includes("bic") ||
      lowerKey.includes("swift")
    ) {
      result[key] = typeof value === "string" ? maskIban(value) : "[REDACTED]";
    } else if (
      lowerKey === "value" &&
      obj["currency"] !== undefined // Likely an Amount object
    ) {
      result[key] = typeof value === "string" ? maskAmount(value) : "[REDACTED]";
    } else if (
      lowerKey.includes("password") ||
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("api_key") ||
      lowerKey.includes("private_key") ||
      lowerKey.includes("signature")
    ) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      result[key] = redactSensitive(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}
