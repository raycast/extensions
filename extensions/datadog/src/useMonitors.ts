import { useEffect, useState } from "react";
import { Monitor } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/Monitor";
import { monitorsApi } from "./datadog-api";
import { showError } from "./util";
import { getPreferenceValues } from "@raycast/api";

type State = {
  monitorsAreLoading: boolean;
  monitors: Monitor[];
};

const tags: string = getPreferenceValues()["tags"];

export const useMonitors = () => {
  const [{ monitorsAreLoading, monitors }, setState] = useState<State>({
    monitors: [],
    monitorsAreLoading: true,
  });

  useEffect(() => {
    monitorsApi
      .listMonitors({ monitorTags: tags })
      .then(monitors => setState(prev => ({ ...prev, monitors })))
      .catch(showError)
      .finally(() => setState(prev => ({ ...prev, monitorsAreLoading: false })));
  }, []);

  return { monitors, monitorsAreLoading };
};
