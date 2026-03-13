import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";

export enum Env {
  Production = "PROD",
  Staging = "STAGING",
  Beta = "BETA",
  Development = "DEV",
}

interface APIConfig {
  id: Env;
  url: string;
}

// Get the appropriate API config for a given Env
const apiConfigs: { [key in Env]: APIConfig } = {
  [Env.Production]: {
    id: Env.Production,
    url: "https://capture-producer-prod.herokuapp.com/capture",
  },
  [Env.Staging]: {
    id: Env.Staging,
    url: "https://capture-producer-staging.herokuapp.com/capture",
  },
  [Env.Beta]: {
    id: Env.Beta,
    url: "https://capture-producer-beta.herokuapp.com/capture",
  },
  [Env.Development]: {
    id: Env.Development,
    url: "https://capture-producer-dev.herokuapp.com/capture",
  },
};

// Default to the production Env
const defaultEnv = Env.Production;

// Key for storing Env in LocalStorage
const storedEnvKey = "storedEnv";

export const useEnv = () => {
  const [env, setEnv] = useState<Env | undefined>();

  const getEnvFromStore = async () => {
    // If Env is already set, immediately return its value
    if (env) return env;

    // Get the previously stored Env from LocalStorage
    const storedEnv = await LocalStorage.getItem<Env>(storedEnvKey);

    // Use the previously stored value if it exists, otherwise use the default value
    const inferredEnv = storedEnv || defaultEnv;

    return inferredEnv;
  };

  // On mount, get the previously stored Env from LocalStorage and set it
  useEffect(() => {
    getEnvFromStore().then((nextEnv) => setEnv(nextEnv));
  }, []);

  // When Env changes, store value in LocalStorage
  useEffect(() => {
    if (env) LocalStorage.setItem(storedEnvKey, env);
  }, [env]);

  return {
    env,
    setEnv,
    envOrder: Object.keys(apiConfigs) as Env[],
    getApiConfig: () => getEnvFromStore().then((env) => apiConfigs[env]),
  };
};
