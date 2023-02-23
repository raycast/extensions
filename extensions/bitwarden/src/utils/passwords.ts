import { pbkdf2 } from "crypto";
import { REPROMPT_HASH_SALT } from "../constants/general";
import { PasswordGeneratorOptions } from "../types/passwords";

export function getPasswordGeneratingArgs(options: PasswordGeneratorOptions): string[] {
  return Object.entries(options).flatMap(([arg, value]) => (value ? [`--${arg}`, value] : []));
}

export async function hashMasterPasswordForReprompting(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    pbkdf2(password, REPROMPT_HASH_SALT, 100000, 64, "sha512", (error, hashed) => {
      if (error != null) {
        reject(error);
        return;
      }

      resolve(hashed.toString("hex"));
    });
  });
}
