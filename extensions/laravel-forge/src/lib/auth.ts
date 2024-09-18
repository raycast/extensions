import { getPreferenceValues } from "@raycast/api";

export const unwrapToken = (tokenKey: string) => {
  const token = getPreferenceValues()?.[tokenKey];
  return token ? token.replace(/Bearer /, "") : "";
};
