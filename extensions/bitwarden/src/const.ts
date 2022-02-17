import { PasswordOptions } from "./types";

export const SESSION_KEY = "sessionToken";
export const PASSWORD_OPTIONS_MAP: Record<keyof PasswordOptions, string> = {
  uppercase: "Include uppercase characters",
  lowercase: "Include lowercase characters",
  number: "Include numeric characters",
  special: "Include special characters",
  passphrase: "Generate a passphrase",
  length: "Length of the password",
  words: "Number of words",
  separator: "Word separator",
  capitalize: "Title case passphrase",
  includeNumber: "Passphrase includes number",
};
