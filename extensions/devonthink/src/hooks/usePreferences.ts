import {getPreferenceValues} from "@raycast/api";
import {useEffect, useState} from "react";

export type Preferences = {
  searchIsShowingDetail: boolean;
};

const usePreferences = () => {
  const [preferences, setPreferences] = useState<Preferences>(emptyPreferences);

  useEffect(() => {
    getPreferenceValues().then((values: Preferences) => setPreferences(values));
  }, []);

  return preferences;
};

export default usePreferences;

const emptyPreferences: Preferences = {
  searchIsShowingDetail: false,
}