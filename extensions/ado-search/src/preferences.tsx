import { getPreferenceValues } from "@raycast/api";

export function preparedPersonalAccessToken(): string {
  const personalAccessToken = getPreferenceValues().personalAccessToken;
  return Buffer.from(":" + personalAccessToken, "binary").toString("base64");
}

export const { organizationName } = getPreferenceValues();
