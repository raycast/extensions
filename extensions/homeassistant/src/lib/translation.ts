import translationsData from "./translations.json";

export function getTranslation(props: { language: string; id: string; fallback?: string }): string {
  const l = props.language;
  const id = props.id;
  const fallback = props.fallback || "?";
  const translations = translationsData as Record<string, Record<string, string>>;
  const d: string | undefined = translations[l]?.[id];
  if (d && d.length > 0) {
    return d;
  }
  return fallback;
}
