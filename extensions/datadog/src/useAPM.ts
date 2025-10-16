import { useEffect, useState } from "react";
import { apiAPM } from "./datadog-api";
import { showError } from "./util";
import { getPreferenceValues } from "@raycast/api";
import { APM } from "./types";

type State = {
  apmIsLoading: boolean;
  apm: APM[];
};

const preferences: Preferences.CommandListApm = getPreferenceValues();
const environments: string = preferences.envs;

export const useAPM = () => {
  const [{ apm, apmIsLoading }, setState] = useState<State>({ apm: [], apmIsLoading: true });

  useEffect(() => {
    const envs = environments.split(",").map(word => word.trim());

    Promise.all(envs.map(env => apiAPM({ env })))
      .then(list => list.flat())
      .then(apm => setState(prev => ({ ...prev, apm })))
      .catch(showError)
      .finally(() => setState(prev => ({ ...prev, apmIsLoading: false })));
  }, []);

  return { apmIsLoading, apm };
};
