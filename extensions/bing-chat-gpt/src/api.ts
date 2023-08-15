import { getPreferenceValues } from "@raycast/api";

export const configuration = {
  bingCookies: getPreferenceValues().bingCookies,
  conversationStyle: getPreferenceValues().conversationStyle,
};
