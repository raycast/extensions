import { getPreferenceValues } from "@raycast/api";

export const preferences: {
  customYamlPath: string;
} = getPreferenceValues();
