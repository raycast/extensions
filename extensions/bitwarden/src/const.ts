import { PasswordOptionField, PasswordOptions } from "./types";

export const SESSION_KEY = "sessionToken";
export const LOCAL_STORAGE_KEY = {
  PASSWORD_OPTIONS: "bw-password-options",
};
export const PASSWORD_OPTIONS_MAP: Record<keyof PasswordOptions, PasswordOptionField> = {
  uppercase: {
    label: "Uppercase characters",
    hint: "ABCDEFGHIJLMNOPQRSTUVWXYZ",
    type: "boolean",
  },
  lowercase: {
    label: "Lowercase characters",
    hint: "abcdefghijklmnopqrstuvwxyz",
    type: "boolean",
  },
  number: {
    label: "Numeric characters",
    hint: "0123456789",
    type: "boolean",
  },
  special: {
    label: "Special characters",
    hint: "!@#$%^&*()_+-=[]{}|;:,./<>?",
    type: "boolean",
  },
  passphrase: {
    label: "Generate a passphrase",
    hint: "this is a passphrase",
    type: "boolean",
  },
  length: {
    label: "Length of the password",
    hint: "5 - 128",
    type: "number",
  },
  words: {
    label: "Number of words",
    hint: "3 - 20",
    type: "number",
  },
  separator: {
    label: "Word separator",
    hint: "this-is-a-passphrase",
    type: "string",
  },
  capitalize: {
    label: "Capitalise passphrase",
    hint: "This-Is-A-Passphrase",
    type: "boolean",
  },
  includeNumber: {
    label: "Passphrase with number",
    hint: "This2-Is-A-Passphrase",
    type: "boolean",
  },
};
