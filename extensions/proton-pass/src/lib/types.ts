export const PROTON_PASS_CLI_DOCS = "https://protonpass.github.io/pass-cli/";

export type VaultRole = "owner" | "manager" | "editor" | "viewer";

export type ItemType = "login" | "note" | "credit_card" | "identity" | "alias" | "ssh_key" | "wifi";

export type PasswordType = "random" | "passphrase";

export interface Vault {
  shareId: string;
  name: string;
  itemCount?: number;
  role?: VaultRole;
  /** Whether other people have access to the vault. */
  isShared?: boolean;
}

/** How a vault is shared: the user's role on it, and whether other people have access, when known. */
export interface VaultSharing {
  role: VaultRole;
  isShared?: boolean;
}

export interface Item {
  shareId: string;
  itemId: string;
  title: string;
  type: ItemType;
  vaultName: string;
  urls?: string[];
  username?: string;
  email?: string;
  hasTotp: boolean;
  /** Whether a login has a password saved. The password itself is never part of `Item`, which gets cached. */
  hasPassword?: boolean;
  /** ISO 8601 date of the last modification. */
  modifiedAt?: string;
  /** Whether the item has a note. The note itself is never part of `Item`. */
  hasNote?: boolean;
}

export interface CustomField {
  name: string;
  value: string;
  type: "text" | "hidden";
}

export interface ItemDetail extends Item {
  password?: string;
  urls?: string[];
  note?: string;
  customFields?: CustomField[];
  /** otpauth:// URI, kept in memory only so codes can be generated locally. */
  totpUri?: string;
}

export interface PasswordOptions {
  type: PasswordType;
  length?: number;
  words?: number;
  includeNumbers?: boolean;
  includeUppercase?: boolean;
  includeSymbols?: boolean;
  separator?: string;
  capitalize?: boolean;
}

export interface PasswordScore {
  numericScore: number;
  passwordScore: string;
  penalties?: string[];
}

export type PassCliErrorType =
  | "unsupported_platform"
  | "not_installed"
  | "not_authenticated"
  | "network_error"
  | "keyring_error"
  | "timeout"
  | "invalid_output"
  | "unknown";

export class PassCliError extends Error {
  type: PassCliErrorType;

  constructor(message: string, type: PassCliErrorType) {
    super(message);
    this.name = "PassCliError";
    this.type = type;
    Object.setPrototypeOf(this, PassCliError.prototype);
  }
}
