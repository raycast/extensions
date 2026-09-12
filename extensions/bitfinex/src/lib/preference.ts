import { getPreferenceValues as _getPreferenceValues } from "@raycast/api";

export type Preference = {
  api_key: string;
  api_secret: string;
  f_currency: string;
  default_rate_view: "list" | "chart";
  high_rate_threshold: string;
  sound: string;
  auto_renew: boolean;
  notify_available: boolean;
  notify_high_rate: boolean;
};

export const getPreferenceValues = () => _getPreferenceValues<Preference>();

export const getCurrency = () => `f${getPreferenceValues().f_currency}`;
export const getSound = () => getPreferenceValues().sound;
export const getHighRateThreshold = () => {
  const { high_rate_threshold } = getPreferenceValues();
  const threshold = Number(high_rate_threshold);

  return Number.isNaN(threshold) ? 24 : threshold;
};
