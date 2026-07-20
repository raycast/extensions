import { useEffect, useState } from "react";
import { CraftPreference, getCraftEnvironment, CraftEnvironmentResult } from "../lib/craftEnvironment";
import { getPreferences } from "../preferences";
import { reportRecoverableException } from "../utils/reportRecoverableException";

export type CraftCommandEnvironment = CraftEnvironmentResult | { status: "error"; message: string };

export type UseCraftEnvironment = {
  environmentLoading: boolean;
  environment: CraftCommandEnvironment | null;
  refreshEnvironment: () => void;
};

export default function useCraftEnvironment(): UseCraftEnvironment {
  const [state, setState] = useState<UseCraftEnvironment>({
    environmentLoading: true,
    environment: null,
    refreshEnvironment: () => undefined,
  });

  const loadEnvironment = async () => {
    setState((previousState) => ({ ...previousState, environmentLoading: true }));

    try {
      const preferences = getPreferences();
      const preferredApplication = preferences.application as unknown as CraftPreference;
      const environment = await getCraftEnvironment(preferredApplication);

      setState((previousState) => ({
        ...previousState,
        environmentLoading: false,
        environment,
      }));
    } catch (error) {
      reportRecoverableException(error);

      setState((previousState) => ({
        ...previousState,
        environmentLoading: false,
        environment: {
          status: "error",
          message: "Could not inspect installed Craft applications.",
        },
      }));
    }
  };

  useEffect(() => {
    void loadEnvironment();
  }, []);

  return {
    ...state,
    refreshEnvironment: () => {
      void loadEnvironment();
    },
  };
}
