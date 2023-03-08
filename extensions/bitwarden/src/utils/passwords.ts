import { LocalStorage } from "@raycast/api";
import { PasswordGeneratorOptions } from "~/types/passwords";
import { DEFAULT_PASSWORD_OPTIONS } from "~/constants/passwords";
import { PasswordGeneratorOptions } from "~/types/passwords";

export function getPasswordGeneratingArgs(options: PasswordGeneratorOptions): string[] {
  return Object.entries(options).flatMap(([arg, value]) => (value ? [`--${arg}`, value] : []));
}

export async function getPasswordGeneratorOptions() {
  const storedOptions = await LocalStorage.getItem<string>(LOCAL_STORAGE_KEY.PASSWORD_OPTIONS);
  return {
    ...DEFAULT_PASSWORD_OPTIONS,
    ...(storedOptions ? JSON.parse(storedOptions) : {}),
  } as PasswordGeneratorOptions;
}