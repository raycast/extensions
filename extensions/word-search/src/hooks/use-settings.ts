import { useMemo } from "react";

import { getPreferenceValues } from "@raycast/api";

export const useDefaultAction = () =>
  useMemo(() => {
    return getPreferenceValues<Preferences>().defaultAction || "paste";
  }, []);

export const useSelectionSetting = () =>
  useMemo(() => {
    const globalSetting = getPreferenceValues<Preferences>().useSelection;
    const commandSetting = getPreferenceValues<
      | Preferences.WordSynonymSearch
      | Preferences.WordAntonymSearch
      | Preferences.WordRhymeSearch
      | Preferences.WordSpell
      | Preferences.WordAdjectiveSearch
      | Preferences.WordMissingLettersSearch
      | Preferences.WordSoundLikeSearch
      | Preferences.WordSuggest
    >().useSelectionHere;

    return commandSetting === "global" ? globalSetting : commandSetting === "true";
  }, []);

export const useCapitalizeResults = () => getPreferenceValues<Preferences>().capitalizeResults;

export const useMaxResults = () =>
  useMemo(() => {
    const res = getPreferenceValues<Preferences>().maxResults || "50";
    const parsed = parseInt(res, 10);
    if (isNaN(parsed)) {
      return 50;
    }
    return Math.max(1, Math.min(parsed, 1000));
  }, []);
