import { getPreferenceValues } from "@raycast/api";
import { apiAPM } from "./datadog-api";
import { APM } from "./types";
import { useLocalState } from "./cache";

type State = {
  apm: APM[];
};

const environments: string = getPreferenceValues()["envs"];

export const useAPM = () => {
  const envs = environments.split(",").map(word => word.trim());
  const loader = () => {
    return Promise.all(envs.map(env => apiAPM({ env })))
      .then(list => list.flat())
      .then(apm => ({ apm: apm } as State));
  };

  const {state, loading: apmIsLoading} = useLocalState<State>("apm", { apm: [] }, loader);

  return { state, apmIsLoading };
};
