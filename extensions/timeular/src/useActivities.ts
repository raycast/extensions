import { Activity } from "./types";
import { useEffect, useState } from "react";
import { apiListAllActivities } from "./api-timeular";

type State = {
  isLoadingActivities: boolean;
  activities: Activity[];
};

export const useActivities = () => {
  const [{ activities, isLoadingActivities }, setState] = useState<State>({
    activities: [],
    isLoadingActivities: true,
  });

  useEffect(() => {
    apiListAllActivities().then(activities => setState({ activities, isLoadingActivities: false }));
  }, []);

  return { activities, isLoadingActivities };
};
