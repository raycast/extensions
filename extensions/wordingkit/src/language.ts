export const DEFAULT_LANGUAGE = "en" as const;

export type Language = "en" | "ru";

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "ru";
}
