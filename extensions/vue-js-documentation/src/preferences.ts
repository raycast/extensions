import { getPreferenceValues } from "@raycast/api";

export const preferences: {
  applicationId: string;
  apiKey: string;
} = getPreferenceValues();
