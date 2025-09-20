import { getPreferenceValues } from "@raycast/api";

type Preferences = {
  login: string;
  secretKey: string;
  currencyFormat: string;
  datetimeFormat: string;
  demo: boolean;
};

export const preferences = getPreferenceValues<Preferences>();
