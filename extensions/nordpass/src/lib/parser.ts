/**
 * Export file parser for NordPass CSV exports
 * Handles parsing CSV files and converting them to our data models
 */

import * as fs from "fs";
import { parse } from "csv-parse/sync";
import { Password, CreditCard, SecureNote } from "../types";

/**
 * Parse a NordPass CSV export file
 * NordPass CSV format typically includes a "type" column to distinguish items
 */
export function parseExportFile(filePath: string): {
  passwords: Password[];
  creditCards: CreditCard[];
  secureNotes: SecureNote[];
} {
  const fileContent = fs.readFileSync(filePath, "utf-8");

  let records: Record<string, string>[];

  try {
    // Parse CSV with headers
    // Use relax_column_count to handle varying column counts (different item types may have different columns)
    records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
    }) as Record<string, string>[];
  } catch (error) {
    // Provide more helpful error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse CSV file: ${errorMessage}. Please ensure the CSV file is properly formatted.`);
  }

  const passwords: Password[] = [];
  const creditCards: CreditCard[] = [];
  const secureNotes: SecureNote[] = [];

  for (const record of records) {
    // Determine item type from the record
    // NordPass CSV may have a "type" column or we infer from available fields
    const itemType = record.type?.toLowerCase() || inferItemType(record);

    switch (itemType) {
      case "password":
      case "login":
        passwords.push(parsePassword(record));
        break;
      case "creditcard":
      case "credit_card":
      case "card":
        creditCards.push(parseCreditCard(record));
        break;
      case "note":
      case "securenote":
      case "secure_note":
        secureNotes.push(parseSecureNote(record));
        break;
      default:
        // If type is unclear, try to infer from fields
        if (hasPasswordFields(record)) {
          passwords.push(parsePassword(record));
        } else if (hasCreditCardFields(record)) {
          creditCards.push(parseCreditCard(record));
        } else if (hasSecureNoteFields(record)) {
          secureNotes.push(parseSecureNote(record));
        }
    }
  }

  return { passwords, creditCards, secureNotes };
}

/**
 * Infer item type from available fields in the record
 */
function inferItemType(record: Record<string, string>): string {
  if (hasCreditCardFields(record)) {
    return "creditcard";
  }
  if (hasPasswordFields(record)) {
    return "password";
  }
  if (hasSecureNoteFields(record)) {
    return "note";
  }
  return "password"; // Default to password if unclear
}

/**
 * Check if record has password-related fields
 */
function hasPasswordFields(record: Record<string, string>): boolean {
  return !!(record.password || record.username || record.url);
}

/**
 * Check if record has credit card fields
 */
function hasCreditCardFields(record: Record<string, string>): boolean {
  return !!(
    record.cardNumber ||
    record.card_number ||
    record.expiryDate ||
    record.expiry_date ||
    record.cvv ||
    record.cardholderName ||
    record.cardholder_name
  );
}

/**
 * Check if record has secure note fields
 */
function hasSecureNoteFields(record: Record<string, string>): boolean {
  // Secure notes typically have a note field but no password/username
  return !!(record.note && !record.password && !record.username);
}

/**
 * Parse a password record
 */
function parsePassword(record: Record<string, string>): Password {
  return {
    type: "password",
    name: record.name || record.title || "",
    url: record.url || record.website || undefined,
    username: record.username || record.login || undefined,
    password: record.password || "",
    note: record.note || record.notes || undefined,
    folder: record.folder || record.category || undefined,
  };
}

/**
 * Parse a credit card record
 */
function parseCreditCard(record: Record<string, string>): CreditCard {
  return {
    type: "creditCard",
    name: record.name || record.title || "",
    cardholderName: record.cardholderName || record.cardholder_name || record.cardholder || undefined,
    cardNumber: record.cardNumber || record.card_number || record.number || undefined,
    expiryDate: record.expiryDate || record.expiry_date || record.expiry || undefined,
    cvv: record.cvv || record.cvc || record.securityCode || undefined,
    note: record.note || record.notes || undefined,
    folder: record.folder || record.category || undefined,
  };
}

/**
 * Parse a secure note record
 */
function parseSecureNote(record: Record<string, string>): SecureNote {
  return {
    type: "secureNote",
    name: record.name || record.title || "",
    note: record.note || record.notes || "",
    folder: record.folder || record.category || undefined,
  };
}

/**
 * Calculate a simple hash of file content for change detection
 */
export function calculateFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath, "utf-8");
  // Simple hash function - in production you might want to use crypto.createHash
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}
