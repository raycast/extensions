export const PROTON_PASS_CLI_DOCS = "https://protonpass.github.io/pass-cli/";

export type VaultRole = "owner" | "manager" | "editor" | "viewer";

export type ItemType = "login" | "note" | "credit_card" | "identity" | "alias" | "ssh_key" | "wifi";

export type PasswordType = "random" | "passphrase";

export interface Vault {
  shareId: string;
  name: string;
  itemCount: number;
  role: VaultRole;
}

export interface Item {
  shareId: string;
  itemId: string;
  title: string;
  type: ItemType;
  vaultName: string;
  username?: string;
  email?: string;
  hasTotp: boolean;
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
