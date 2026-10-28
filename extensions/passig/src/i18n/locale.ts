/**
 * Rilevamento della lingua (puro, senza dipendenze da Raycast: testabile con `node --test`).
 */
import { execFileSync } from "node:child_process";

export type Language = "en" | "it" | "es" | "de" | "fr" | "pt-BR" | "ja";
export type LanguagePreference = Language | "system";

export const LANGUAGES: readonly Language[] = ["en", "it", "es", "de", "fr", "pt-BR", "ja"];

/** Normalizza un tag BCP-47 / locale POSIX (`pt_BR.UTF-8`, `de-CH`, `ja_JP`) in una lingua supportata. */
export function matchLanguage(tag: string | undefined | null): Language | null {
  if (!tag) return null;
  const base = tag.trim().split(/[.@]/)[0]!.replace(/_/g, "-").toLowerCase();
  if (!base || base === "c" || base === "posix") return null;
  const primary = base.split("-")[0]!;
  if (primary === "pt") return "pt-BR";
  return (LANGUAGES as readonly string[]).includes(primary) ? (primary as Language) : null;
}

/**
 * Lingua del sistema, in ordine: variabili d'ambiente POSIX (`LC_ALL`, `LC_MESSAGES`,
 * `LANG`, `LANGUAGE`), locale ICU di Node (ignorando il default generico `en-US` che
 * Node usa quando non sa nulla), `AppleLocale` di macOS; fallback `en`.
 */
export function systemLanguage(env: NodeJS.ProcessEnv = process.env, platform: string = process.platform): Language {
  const icu = safeResolvedLocale();
  const generic = !icu || /^en-US(-u-va-posix)?$/i.test(icu);
  const candidates = [env.LC_ALL, env.LC_MESSAGES, env.LANG, env.LANGUAGE?.split(":")[0], generic ? undefined : icu];
  for (const c of candidates) {
    const lang = matchLanguage(c);
    if (lang) return lang;
  }
  if (platform === "darwin") {
    const mac = matchLanguage(macAppleLocale());
    if (mac) return mac;
  }
  return matchLanguage(icu) ?? "en";
}

function safeResolvedLocale(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return undefined;
  }
}

/** `defaults read -g AppleLocale` (es. `it_IT`): il processo Node di Raycast non eredita LANG. */
function macAppleLocale(): string | undefined {
  try {
    return execFileSync("defaults", ["read", "-g", "AppleLocale"], {
      encoding: "utf8",
      timeout: 1000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

/** Risolve la preferenza (`system` o una lingua) nella lingua effettiva. */
export function resolveLanguage(pref: string | undefined | null): Language {
  if (!pref || pref === "system") return systemLanguage();
  return matchLanguage(pref) ?? "en";
}
