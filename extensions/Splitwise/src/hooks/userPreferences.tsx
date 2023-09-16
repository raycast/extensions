import { getPreferenceValues } from "@raycast/api";

const { personalAccessToken } = getPreferenceValues();
export const { loadingLimit } = getPreferenceValues();

export const HEADER = {
  headers: {
    Authorization: `Bearer ${personalAccessToken}`,
  },
};
