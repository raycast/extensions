import crypto from "node:crypto";

export function generatePassword(len: number, useNumbers: boolean, useChars: boolean): string {
  let charset = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
  if (useNumbers) {
    charset += "23456789";
  }
  if (useChars) {
    charset += "!@#$*^&%";
  }
  let retVal = "";
  for (let i = 0; i < len; ++i) {
    retVal += charset.charAt(crypto.randomInt(charset.length));
  }
  return retVal;
}
