import { getPreferenceValues } from "@raycast/api";

export const BASE_URL = "https://api.football-data.org/v4/competitions/BSA";

export const authHeaders = {
  "X-Auth-Token": getPreferenceValues<{ apiKey: string }>().apiKey,
};
