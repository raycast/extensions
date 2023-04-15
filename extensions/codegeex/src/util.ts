import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";

export const usePreferences = () => {
  return useMemo(() => getPreferenceValues(), []);
};
