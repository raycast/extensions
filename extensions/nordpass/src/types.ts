/**
 * TypeScript interfaces for NordPass data structures
 * These types represent the data exported from NordPass in CSV format
 */

/**
 * Represents a password entry from NordPass
 */
export interface Password {
  type: "password";
  name: string;
  url?: string;
  username?: string;
  password: string;
  note?: string;
  folder?: string;
}

/**
 * Represents a credit card entry from NordPass
 */
export interface CreditCard {
  type: "creditCard";
  name: string;
  cardholderName?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  note?: string;
  folder?: string;
}

/**
 * Represents a secure note entry from NordPass
 */
export interface SecureNote {
  type: "secureNote";
  name: string;
  note: string;
  folder?: string;
}

/**
 * Union type for all NordPass item types
 */
export type NordPassItem = Password | CreditCard | SecureNote;

/**
 * Cached data structure stored locally
 */
export interface CachedData {
  passwords: Password[];
  creditCards: CreditCard[];
  secureNotes: SecureNote[];
  lastUpdated: number; // Unix timestamp
  exportFileHash?: string; // Hash of the export file to detect changes
}
