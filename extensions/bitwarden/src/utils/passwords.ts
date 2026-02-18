import { LocalStorage } from "@raycast/api";
import { pbkdf2 } from "crypto";
import { LOCAL_STORAGE_KEY } from "~/constants/general";
import { DEFAULT_PASSWORD_OPTIONS, REPROMPT_HASH_SALT } from "~/constants/passwords";
import { PASSPHRASE_OPTION_KEYS, PASSWORD_OPTION_KEYS, PasswordGeneratorOptions } from "~/types/passwords";

export function getPasswordGeneratingArgs(options: PasswordGeneratorOptions): string[] {
  const validOptions: readonly string[] = options.passphrase ? PASSPHRASE_OPTION_KEYS : PASSWORD_OPTION_KEYS;
  return Object.entries(options).flatMap(
    ([arg, value]: [string, PasswordGeneratorOptions[keyof PasswordGeneratorOptions]]) => {
      if (!validOptions.includes(arg)) return [];
      switch (typeof value) {
        case "boolean":
          if (value) return [`--${arg}`];
          return [];
        case "string":
          return [`--${arg}`, value];
        default:
          return [];
      }
    }
  );
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
