import { useEffect, useState } from "react";
import Config from "../Config";
import { UseAppExists } from "./useAppExists";

export type UseConfig = {
  configLoading: boolean;
  config: Config | undefined;
};

export default function useConfig({ appExistsLoading, appExists }: UseAppExists) {
  const [state, setState] = useState<UseConfig>({ configLoading: true, config: undefined });

  useEffect(() => {
    if (appExistsLoading) return;

    console.log("useConfig");

    if (!appExists) {
      return setState((prev) => ({ ...prev, configIsLoading: false }));
    }

    setState({ configLoading: false, config: new Config() });
  }, [appExistsLoading]);

  return state;
}
