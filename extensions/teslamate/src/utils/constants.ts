import { getPreferenceValues } from "@raycast/api";

export const baseGrafanaUrl = getPreferenceValues().tmGrafanaUrl;

// Check for the trailing slash and remove it if present
export const tmGrafanaUrl = baseGrafanaUrl.endsWith("/")
  ? baseGrafanaUrl.slice(0, -1)
  : baseGrafanaUrl + "/api/ds/query";
export const dataSourceUuid = getPreferenceValues().dataSourceUuid;
export const saToken = getPreferenceValues().saToken;
