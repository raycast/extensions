// src/hooks/useApiClient.ts
import { getPreferenceValues } from "@raycast/api";
import { useMemo } from "react";
import { ApiClient } from "../api/client";
import { getAuthCommand, getAuthFilePath, loadCliAuth, type CliAuth } from "../lib/cli-auth";
import { getEnvironmentConfig, type Environment } from "../lib/env";

interface Preferences {
  environment: Environment;
}

export interface UseApiClientResult {
  client: ApiClient | null;
  auth: CliAuth | null;
  env: Environment;
  authError: string | null;
  authCommand: string;
  authFilePath: string;
}

export function useApiClient(): UseApiClientResult {
  const { environment } = getPreferenceValues<Preferences>();

  return useMemo(() => {
    const auth = loadCliAuth(environment);
    const { baseUrl } = getEnvironmentConfig(environment);
    const authCommand = getAuthCommand(environment);
    const authFilePath = getAuthFilePath(environment);

    if (!auth) {
      return {
        client: null,
        auth: null,
        env: environment,
        authError: `No Niteshift CLI credentials found for the ${environment} environment.`,
        authCommand,
        authFilePath,
      };
    }

    return {
      client: new ApiClient(baseUrl, auth.token),
      auth,
      env: environment,
      authError: null,
      authCommand,
      authFilePath,
    };
  }, [environment]);
}
