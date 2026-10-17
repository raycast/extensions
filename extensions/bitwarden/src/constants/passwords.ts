import { PasswordGeneratorOptions } from "~/types/passwords";

/**
 * Bullet-character mask displayed in place of sensitive field values
 * (e.g. passwords, security codes, TOTP secrets) while the field is in
 * its hidden/masked state.
 */
export const SECRETS_MASK = "••••••••";

export const REPROMPT_HASH_SALT = "foobarbazzybaz";

export const DEFAULT_PASSWORD_OPTIONS: Required<PasswordGeneratorOptions> = {
  lowercase: true,
  uppercase: true,
  number: false,
  special: false,
  passphrase: false,
  length: "14",
  words: "3",
  separator: "-",
  capitalize: false,
  includeNumber: false,
  minNumber: "1",
  minSpecial: "1",
};
