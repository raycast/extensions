import { execFileSync } from "node:child_process";

/** Reads the macOS region setting, for example "de_DE@calendar=gregorian". Throws when unavailable. */
export type LocaleReader = () => string;

const readAppleLocale: LocaleReader = () =>
  execFileSync("/usr/bin/defaults", ["read", "-g", "AppleLocale"], { encoding: "utf8", timeout: 2000 });

/** "de_DE@calendar=gregorian" becomes "de-DE". Returns undefined for anything that is not a valid tag. */
export function toLanguageTag(appleLocale: string): string | undefined {
  const base = appleLocale.trim().split("@")[0].replace(/_/g, "-");
  if (!/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(base)) return undefined;
  try {
    return Intl.getCanonicalLocales(base)[0];
  } catch {
    return undefined;
  }
}

/**
 * Locale for amounts, dates and times: the macOS region (System Settings, General, Language & Region).
 * Node inside Raycast does not derive it reliably. This is formatting only, never the UI language.
 * `undefined` means "use Intl's default".
 */
export function resolveSystemLocale(read: LocaleReader): string | undefined {
  try {
    return toLanguageTag(read());
  } catch {
    return undefined;
  }
}

let cached: { value: string | undefined } | undefined;

export function systemLocale(): string | undefined {
  cached ??= { value: resolveSystemLocale(readAppleLocale) };
  return cached.value;
}
