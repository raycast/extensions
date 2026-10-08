import { useLocale } from "../state/locale";
import { usePreferences } from "./usePreferences";

export function useCurrencyFormatter() {
  const locale = useLocale();
  const { currency } = usePreferences();

  return new Intl.NumberFormat(locale, {
    currency,
    style: "currency",
  });
}
