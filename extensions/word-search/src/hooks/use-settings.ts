import { useMemo } from "react";

import { getPreferenceValues } from "@raycast/api";

export const useDefaultAction = () =>
  useMemo(() => {
    return getPreferenceValues<Preferences>().defaultAction || "paste";
  }, []);

export const useSelectionSetting = () => getPreferenceValues<Preferences>().useSelection;

export const useCapitalizeResults = () => getPreferenceValues<Preferences>().capitalizeResults;
