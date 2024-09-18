import { useEffect, useState } from "react";
import { RUMApplicationList } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v2/models/RUMApplicationList";
import { rumApi } from "./datadog-api";
import { showError } from "./util";

type State = {
  isLoading: boolean;
  rumApplications: RUMApplicationList[];
};

export const useRUM = () => {
  const [{ isLoading, rumApplications }, setState] = useState<State>({
    isLoading: true,
    rumApplications: [],
  });

  useEffect(() => {
    rumApi
      .getRUMApplications()
      .then(response => response.data || [])
      .then(rumApplications => setState(prev => ({ ...prev, rumApplications })))
      .catch(showError)
      .finally(() => setState(prev => ({ ...prev, isLoading: false })));
  }, []);

  return { rumApplications, isLoading };
};
