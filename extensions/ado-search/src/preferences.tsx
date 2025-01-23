import { getPreferenceValues } from "@raycast/api";

export function preparedPersonalAccessToken(): string {
  const personalAccessToken = getPreferenceValues().personalAccessToken;
  return Buffer.from(":" + personalAccessToken, "binary").toString("base64");
}

export function baseApiUrl(): string {
  return `https://dev.azure.com/${getPreferenceValues().organizationName}`;
}

export const { organizationName } = getPreferenceValues();
