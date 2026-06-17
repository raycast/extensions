import { preferences } from "./preferences";

export const currency = new Intl.NumberFormat(preferences.currencyFormat, {
  style: "currency",
  currency: "EUR", // Qonto is EUR only?
});
