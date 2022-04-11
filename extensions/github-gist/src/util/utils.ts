import { Form, getPreferenceValues } from "@raycast/api";
import Values = Form.Values;

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    personalAccessTokens: preferencesMap.get("access-token"),
    rememberTag: preferencesMap.get("remember-tag"),
    detail: preferencesMap.get("detail"),
    primaryAction: preferencesMap.get("primary-action"),
  };
};
export const preference = preferences();

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};
