import { Monitor } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/Monitor";
import { getPreferenceValues } from "@raycast/api";
import { Caches } from ".";
import { monitorsApi } from "../clients/datadog";
import { useLocalState } from "./cache";

type State = {
  monitors: Monitor[];
};

const tags: string = getPreferenceValues()["tags"];

export const useMonitors = () => {
  const loader = () => {
    return monitorsApi.listMonitors({ monitorTags: tags }).then(monitors => ({ monitors: monitors } as State));
  };

  const { state, loading: monitorsAreLoading } = useLocalState<State>(Caches.Monitors, { monitors: [] }, loader);

  return { state, monitorsAreLoading };
};
