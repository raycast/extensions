import en from "../locales/en.json";
import pt from "../locales/pt.json";
import ptBR from "../locales/pt-BR.json";
import es from "../locales/es.json";

export type Language = "en" | "pt" | "pt-BR" | "es";

export const AVAILABLE_LANGUAGES: Language[] = ["en", "pt", "pt-BR", "es"];

const translations: Record<Language, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  pt: pt as Record<string, unknown>,
  "pt-BR": ptBR as Record<string, unknown>,
  es: es as Record<string, unknown>,
};

export function t(key: string, lang: Language = "en"): string {
  const keys = key.split(".");
  let val: unknown = translations[lang];

  for (const k of keys) {
    if (val && typeof val === "object" && k in (val as Record<string, unknown>)) {
      val = (val as Record<string, unknown>)[k];
    } else {
      if (lang !== "en") {
        return t(key, "en");
      }
      return key;
    }
  }

  if (typeof val === "string") {
    return val;
  }

  return key;
}

export function getLanguageName(lang: Language): string {
  switch (lang) {
    case "en":
      return "English";
    case "pt":
      return "Português";
    case "pt-BR":
      return "Português (Brasil)";
    case "es":
      return "Español";
    default:
      return lang;
  }
}
