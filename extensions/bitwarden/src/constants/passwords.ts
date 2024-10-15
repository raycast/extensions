import { PasswordGeneratorOptions } from "~/types/passwords";

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
