import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { Endpoints, environments } from "../config.provider";
import { useEffect, useState } from "react";

export type Config = {
  preferences: Preferences;
  endpoints: Endpoints;
  slug: string;
};

export async function getConfig(): Promise<Config> {
  const preferences = getPreferenceValues<Preferences>();
  const slug = await LocalStorage.getItem<string>("slug");

  if (slug == null) {
    throw new Error("Slug not found in local storage. Please log out and log back in.");
  }

  return {
    preferences,
    endpoints: environments[preferences.environment] ?? environments["prod"],
    slug,
  };
}

export function useConfig() {
  const [config, setConfig] = useState<Config | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    getConfig().then(setConfig);
    setIsLoading(false);
  }, []);

  return { config, isLoading };
}
