import { useLocale } from "../state/locale";

export function useDateFormatter() {
  const locale = useLocale();
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}
