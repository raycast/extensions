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
  length?: string;
  /** Minimum number of numeric characters */
  minNumber?: string;
  /** Minimum number of special characters */
  minSpecial?: string;
}

export interface PassphraseOptions {
  /** Number of words */
  words?: string;
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
