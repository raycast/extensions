import { getPreferenceValues } from "@raycast/api";

export type LunchMoneyPreferences = {
  token: string;
};

export const getPreferences = getPreferenceValues<LunchMoneyPreferences>;
