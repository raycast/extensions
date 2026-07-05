export type Lang = "en" | "zh-Hans";

export function detectLang(): Lang {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    return locale.startsWith("zh") ? "zh-Hans" : "en";
  } catch {
    return "en";
  }
}
