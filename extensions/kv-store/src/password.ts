import { randomInt } from "node:crypto";

const PASSWORD_LENGTH = 12;
const PASSWORD_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

export function generatePassword() {
  return Array.from({ length: PASSWORD_LENGTH }, () =>
    PASSWORD_CHARACTERS.charAt(randomInt(PASSWORD_CHARACTERS.length)),
  ).join("");
}
