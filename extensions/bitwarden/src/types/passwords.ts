export interface PasswordHistory {
  lastUsedDate: string;
  password: string;
}

export type PasswordType = "password" | "passphrase";

export interface PasswordOptions {
  /** Include uppercase characters */
  lowercase?: boolean;
  /** Include lowercase characters */
  uppercase?: boolean;
  /** Include numeric characters */
  number?: boolean;
  /** Include special characters */
  special?: boolean;
  /** Length of the password */
  length?: number;
}

export interface PassphraseOptions {
  /** Number of words */
  words?: number;
  /** Word separator */
  separator?: string;
  /** Title case passphrase */
  capitalize?: boolean;
  /** Passphrase includes number */
  includeNumber?: boolean;
}
export type PasswordGeneratorOptions = {
  /** Generate a passphrase */
  passphrase?: boolean;
} & PasswordOptions &
  PassphraseOptions;

export interface PasswordOptionField {
  label: string;
  hint?: string;
  type: "boolean" | "number" | "string";
  errorMessage?: string;
}

export type PasswordOptionsToFieldEntries = [keyof PasswordGeneratorOptions, PasswordOptionField];
