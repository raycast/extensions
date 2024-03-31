import { getPreferenceValues } from "@raycast/api";
import { SITE_TO_LOCALE_MAP } from "./constants";

export const formatPrice = (price: number, currency: string) => {
  const { siteId } = getPreferenceValues<Preferences>();
  const locale = SITE_TO_LOCALE_MAP[siteId];
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(price);
};
