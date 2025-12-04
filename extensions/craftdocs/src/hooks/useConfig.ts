import { useEffect, useState } from "react";
import Config from "../Config";
import { UseAppExists } from "./useAppExists";

export type UseConfig = {
  configLoading: boolean;
  config: Config | null;
  refreshConfig: () => void;
};

export default function useConfig({ appExistsLoading, appExists }: UseAppExists) {
  const [state, setState] = useState<{ configLoading: boolean; config: Config | null }>({
    configLoading: true,
    config: null as Config | null,
  });

  const loadConfig = () => {
    if (appExistsLoading) return;

    if (!appExists) {
      return setState((prev) => ({ ...prev, configLoading: false }));
    }

    setState({ configLoading: false, config: new Config() });
  };

  const refreshConfig = () => {
    if (appExists) {
      setState({ configLoading: false, config: new Config() });
    }
  };

  useEffect(() => {
    loadConfig();
  }, [appExistsLoading]);

  return {
    ...state,
    refreshConfig,
  };
}
