import {useEffect, useState} from "react";
import {apiAPM} from "./datadog-api";
import {showError} from "./util";

type State = {
  apmIsLoading: boolean;
  apm: [string, { calls: string[] }][];
};

export const useAPM = () => {
  const [{apm, apmIsLoading}, setState] = useState<State>({apm: [], apmIsLoading: true});

  useEffect(() => {
    apiAPM({})
      .then(apm => setState(prev => ({...prev, apm})))
      .catch(showError)
      .finally(() => setState(prev => ({...prev, apmIsLoading: false})));
  }, []);

  return {apmIsLoading, apm};
}
