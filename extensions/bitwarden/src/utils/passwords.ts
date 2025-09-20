import { LocalStorage } from "@raycast/api";
import { pbkdf2 } from "crypto";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { DEFAULT_PASSWORD_OPTIONS, REPROMPT_HASH_SALT } from "~/constants/passwords";
import { PasswordGeneratorOptions } from "~/types/passwords";

export function getPasswordGeneratingArgs(options: PasswordGeneratorOptions): string[] {
  return Object.entries(options).flatMap(([arg, value]) => (value ? [`--${arg}`, value] : []));
}

export function hashMasterPasswordForReprompting(password: string): Promise<string> {
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

export async function getPasswordGeneratorOptions() {
  const storedOptions = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS);
  return {
    ...DEFAULT_PASSWORD_OPTIONS,
    ...(storedOptions ? JSON.parse(storedOptions) : {}),
  } as PasswordGeneratorOptions;
}
