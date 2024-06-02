import { useCachedState, useLocalStorage } from "@raycast/utils";
import { useEffect, useState } from "react";
import { STORE, UPDATE_INTERVALS } from "../constants";
import { Interval, LanguageCode } from "../types";
import { execute, fireToast } from "../utils";

export interface LanguageFields {
  firstLanguage: LanguageCode;
  secondLanguage: LanguageCode;
  learningLanguage: LanguageCode | "";
}

export interface AppConfig extends LanguageFields {
  wordInterval: Interval;
}

export const initialAppConfig: AppConfig = {
  firstLanguage: "en",
  secondLanguage: "es",
  learningLanguage: "",
  wordInterval: UPDATE_INTERVALS[0],
};

export interface AppCachedConfig {
  swapWordsInMenuBar: boolean;
  delimiter: string;
}

export const initialCachedConfig: AppCachedConfig = {
  delimiter: "→",
  swapWordsInMenuBar: false,
};

export type CombinedConfig = AppCachedConfig & AppConfig;

export const initialConfig: CombinedConfig = { ...initialAppConfig, ...initialCachedConfig };

export const useConfig = () => {
  const { value: appConfig, setValue: setConfig, isLoading } = useLocalStorage<AppConfig>(STORE.CONFIG);
  const [cachedConfig = initialCachedConfig, setCachedConfig] = useCachedState<AppCachedConfig>(STORE.CONFIG);

  const [combinedConfigState, setCombinedConfigState] = useState<CombinedConfig>({
    ...(appConfig || initialAppConfig),
    ...cachedConfig,
  });

  useEffect(() => {
    if (isLoading || !appConfig || !cachedConfig || !Object.keys(appConfig).length) {
      return;
    }
    const combinedConfig = { ...appConfig, ...cachedConfig };
    setCombinedConfigState(combinedConfig);
  }, [appConfig, cachedConfig, isLoading]);

  const updateConfig = <K extends keyof CombinedConfig>(key: K, value: CombinedConfig[K]) => {
    setCombinedConfigState((prevState) => ({ ...prevState, [key]: value }));
  };

  const saveConfig = async () => {
    try {
      await setConfig({
        firstLanguage: combinedConfigState.firstLanguage,
        learningLanguage: combinedConfigState.learningLanguage,
        secondLanguage: combinedConfigState.secondLanguage,
        wordInterval: combinedConfigState.wordInterval,
      });
      setCachedConfig({
        delimiter: combinedConfigState.delimiter,
        swapWordsInMenuBar: combinedConfigState.swapWordsInMenuBar,
      });
      await execute("menu-bar");
      await fireToast("Success", "Settings Saved");
    } catch (error) {
      await fireToast("Failure", "Failed to Save Settings", error);
    }
  };

  return {
    config: combinedConfigState,
    updateConfig,
    saveConfig,
    isLoadingConfig: isLoading,
  };
};
