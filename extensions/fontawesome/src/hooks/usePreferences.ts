import { getPreferenceValues } from "@raycast/api";

export const usePreferences = () => {
  let { API_TOKEN, STYLE_PREFERENCE } = getPreferenceValues<Preferences>();
  let account = "pro";

  //if pro API Token not provided, use free API Token
  if (!API_TOKEN) {
    API_TOKEN = "D7A31EA9-20D8-434E-A6C6-8ADC890ADCB8";
    account = "free";
    STYLE_PREFERENCE = "fas";
  }

  return { API_TOKEN, STYLE_PREFERENCE, account };
};
