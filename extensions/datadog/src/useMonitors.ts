import { useEffect, useState } from "react";
import { MonitorSearchResponse } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/MonitorSearchResponse";
import { monitorsApi } from "./datadog-api";
import { showError } from "./util";

type State = {
  monitorsAreLoading: boolean;
  monitorResponse?: MonitorSearchResponse;
};

export const useMonitors = (query: string) => {
  const [state, setState] = useState<State>({ monitorsAreLoading: true });

  useEffect(() => {
    setState(prev => ({ ...prev, monitorsAreLoading: true }));

    monitorsApi
      .searchMonitors({ query, page: 0, perPage: 50 })
      .then(monitorResponse => setState(prev => ({ ...prev, monitorResponse, monitorsAreLoading: false })))
      .catch(showError);
  }, [query]);

  return state;
};
