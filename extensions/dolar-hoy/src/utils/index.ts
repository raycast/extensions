import { Currency } from "../types";

export const getCurrencyName = (currency: Currency) => {
  switch (currency) {
    case Currency.ars:
      return "ARS";
    case Currency.usd_blue:
      return "USD Blue";
    case Currency.usd_official:
      return "USD Official";
  }
};
