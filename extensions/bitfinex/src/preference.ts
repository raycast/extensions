import { getPreferenceValues as _getPreferenceValues } from "@raycast/api";

export type Preference = {
  api_key: string;
  api_secret: string;
  f_currency: string;
};

export const getPreferenceValues = () => _getPreferenceValues<Preference>();

export const getCurrency = () => `f${getPreferenceValues().f_currency}`;
