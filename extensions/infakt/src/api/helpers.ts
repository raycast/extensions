import { getPreferenceValues } from "@raycast/api";

export const ApiBaseUrl = "https://api.infakt.pl/api/v3";

export const ApiUrls = {
  invoices: `${ApiBaseUrl}/invoices.json`,
  clients: `${ApiBaseUrl}/clients.json`,
  products: `${ApiBaseUrl}/products.json`,
  vat_rates: `${ApiBaseUrl}/vat_rates.json`,
  bank_accounts: `${ApiBaseUrl}/bank_accounts.json`,
};

type Preferences = {
  xApiKey: string;
};

const { xApiKey } = getPreferenceValues<Preferences>();

export const ApiHeaders = {
  "X-inFakt-ApiKey": xApiKey,
  "Content-Type": "application/json",
};
