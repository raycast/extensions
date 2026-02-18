import { asOptionKeys } from "~/utils/types";

export type PasswordType = "password" | "passphrase";

export type PasswordOptions = {
  /** Do not generate a passphrase */
  passphrase?: false;
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
};

/** Keys for the password options to be used at runtime */
export const PASSWORD_OPTION_KEYS: readonly string[] = asOptionKeys<PasswordOptions>()([
  "passphrase",
  "lowercase",
  "uppercase",
  "number",
  "special",
  "length",
  "minNumber",
  "minSpecial",
]);

export type PassphraseOptions = {
  /** Generate a passphrase */
  passphrase?: true;
  /** Number of words */
  words?: string;
  /** Word separator */
  separator?: string;
  /** Title case passphrase */
  capitalize?: boolean;
  /** Passphrase includes number */
  includeNumber?: boolean;
};

/** Keys for the passphrase options to be used at runtime */
export const PASSPHRASE_OPTION_KEYS: readonly string[] = asOptionKeys<PassphraseOptions>()([
  "passphrase",
  "words",
  "separator",
  "capitalize",
  "includeNumber",
]);

export type PasswordGeneratorOptions = {
  /** Generate a passphrase */
  passphrase: boolean;
} & Omit<PasswordOptions, "passphrase"> &
  Omit<PassphraseOptions, "passphrase">;
