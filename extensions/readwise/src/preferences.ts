import { getPreferenceValues } from "@raycast/api";

export const getPreferences = () =>
  getPreferenceValues<{
    token: string;
    pageSize: number;
  }>();
