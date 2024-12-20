import { getPreferenceValues } from "@raycast/api";
import { Application } from "@raycast/api";

export const preferences: {
  connectionId: string;
  connectionPin: string;
  pritunlApp: Application;
} = getPreferenceValues();
