import { useCachedPromise } from "@raycast/utils";
import {
  AppConfigClient,
  ListApplicationsCommand,
  ListConfigurationProfilesCommand,
  ListEnvironmentsCommand,
  ListHostedConfigurationVersionsCommand,
  GetHostedConfigurationVersionCommand,
  CreateHostedConfigurationVersionCommand,
  StartDeploymentCommand,
} from "@aws-sdk/client-appconfig";
import { isReadyToFetch } from "../util";

export function useAppConfigApps() {
  const {
    data: apps,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const client = new AppConfigClient({});
      const { Items } = await client.send(new ListApplicationsCommand({}));
      return Items ?? [];
    },
    [],
    { execute: isReadyToFetch(), failureToastOptions: { title: "Failed to load AppConfig applications" } },
  );

  return { apps, error, isLoading: (!apps && !error) || isLoading, revalidate };
}

export function useAppConfigProfiles(applicationId: string) {
  const {
    data: profiles,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (appId: string) => {
      const client = new AppConfigClient({});
      const { Items } = await client.send(new ListConfigurationProfilesCommand({ ApplicationId: appId }));
      // Filter to only feature flag profiles
      return (Items ?? []).filter((p) => p.Type === "AWS.AppConfig.FeatureFlags");
    },
    [applicationId],
    {
      execute: isReadyToFetch() && !!applicationId,
      failureToastOptions: { title: "Failed to load configuration profiles" },
    },
  );

  return { profiles, error, isLoading: (!profiles && !error) || isLoading, revalidate };
}

export function useAppConfigEnvironments(applicationId: string) {
  const {
    data: environments,
    error,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async (appId: string) => {
      const client = new AppConfigClient({});
      const { Items } = await client.send(new ListEnvironmentsCommand({ ApplicationId: appId }));
      return Items ?? [];
    },
    [applicationId],
    { execute: isReadyToFetch() && !!applicationId, failureToastOptions: { title: "Failed to load environments" } },
  );

  return { environments, error, isLoading: (!environments && !error) || isLoading, revalidate };
}

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  variants?: Record<string, unknown>;
  constraints?: unknown[];
}

export interface FeatureFlagsConfig {
  flags: Record<
    string,
    { name: string; description?: string; _variants?: Record<string, unknown>; _constraints?: unknown[] }
  >;
  values: Record<string, { enabled: boolean; [key: string]: unknown }>;
  version?: string;
}

export function useFeatureFlags(applicationId: string, environmentId: string, configurationProfileId: string) {
  const { data, error, isLoading, revalidate } = useCachedPromise(
    async (appId: string, _envId: string, profileId: string) => {
      const client = new AppConfigClient({});

      // Get the latest version number
      const versionsResponse = await client.send(
        new ListHostedConfigurationVersionsCommand({
          ApplicationId: appId,
          ConfigurationProfileId: profileId,
          MaxResults: 1,
        }),
      );

      const latestVersion = versionsResponse.Items?.[0]?.VersionNumber;
      if (!latestVersion) {
        return { flags: [], rawConfig: null };
      }

      // Get the actual configuration content
      const configResponse = await client.send(
        new GetHostedConfigurationVersionCommand({
          ApplicationId: appId,
          ConfigurationProfileId: profileId,
          VersionNumber: latestVersion,
        }),
      );

      if (!configResponse.Content || configResponse.Content.length === 0) {
        return { flags: [], rawConfig: null };
      }

      const configText = new TextDecoder().decode(configResponse.Content);

      if (!configText || configText.trim() === "") {
        return { flags: [], rawConfig: null };
      }

      const config = JSON.parse(configText) as FeatureFlagsConfig;

      // Handle malformed config (missing flags or values)
      if (!config.flags || !config.values) {
        return { flags: [], rawConfig: config };
      }

      // Transform to flat list
      const flags: FeatureFlag[] = Object.entries(config.flags).map(([key, flagDef]) => ({
        key,
        name: flagDef.name || key,
        description: flagDef.description,
        enabled: config.values[key]?.enabled ?? false,
        variants: flagDef._variants,
        constraints: flagDef._constraints,
      }));

      return { flags, rawConfig: config };
    },
    [applicationId, environmentId, configurationProfileId],
    {
      execute: isReadyToFetch() && !!applicationId && !!environmentId && !!configurationProfileId,
      failureToastOptions: { title: "Failed to load feature flags" },
    },
  );

  return {
    flags: data?.flags ?? [],
    rawConfig: data?.rawConfig ?? null,
    error,
    isLoading: (!data && !error) || isLoading,
    revalidate,
  };
}

export async function toggleFeatureFlag(
  applicationId: string,
  configurationProfileId: string,
  environmentId: string,
  flagKey: string,
  currentConfig: FeatureFlagsConfig,
  newEnabledState: boolean,
): Promise<void> {
  const client = new AppConfigClient({});

  // Update the config
  const updatedConfig = {
    ...currentConfig,
    values: {
      ...currentConfig.values,
      [flagKey]: {
        ...currentConfig.values[flagKey],
        enabled: newEnabledState,
      },
    },
  };

  // Create new configuration version
  const versionResponse = await client.send(
    new CreateHostedConfigurationVersionCommand({
      ApplicationId: applicationId,
      ConfigurationProfileId: configurationProfileId,
      Content: new TextEncoder().encode(JSON.stringify(updatedConfig)),
      ContentType: "application/json",
    }),
  );

  if (!versionResponse.VersionNumber) {
    throw new Error("Failed to create configuration version");
  }

  // Deploy immediately
  await client.send(
    new StartDeploymentCommand({
      ApplicationId: applicationId,
      EnvironmentId: environmentId,
      ConfigurationProfileId: configurationProfileId,
      ConfigurationVersion: String(versionResponse.VersionNumber),
      DeploymentStrategyId: "AppConfig.AllAtOnce",
    }),
  );
}
