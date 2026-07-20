import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listApplications } from "../api/applications";
import { Application } from "../types/application";
import { Environment } from "../types/environment";

interface AppEnvState {
  applicationId: string;
  environmentId: string;
  applications: Application[];
  environments: Environment[];
  isLoading: boolean;
}

export function useAppEnvSelector(): AppEnvState & {
  setApplicationId: (id: string) => void;
  setEnvironmentId: (id: string) => void;
  Dropdown: React.FC;
} {
  const [applicationId, setApplicationId] = useState("");
  const [environmentId, setEnvironmentId] = useState("");

  const { data: appsData, isLoading: appsLoading } = useCachedPromise(
    () => listApplications(undefined, "environments"),
    [],
  );

  const apps = useMemo(() => appsData?.data ?? [], [appsData?.data]);

  // Build a map of app ID → environments from the included JSON:API data
  const envsByApp = useMemo(() => {
    const map: Record<string, Environment[]> = {};
    const included = appsData?.included ?? [];
    const envMap = new Map<string, Environment>();

    for (const resource of included) {
      if (resource.type === "environments") {
        envMap.set(resource.id, resource as unknown as Environment);
      }
    }

    for (const app of apps) {
      const envIds = app.relationships?.environments?.data ?? [];
      map[app.id] = envIds.map((ref) => envMap.get(ref.id)).filter((e): e is Environment => !!e);
    }

    return map;
  }, [appsData?.included, apps]);

  const envs = useMemo(() => envsByApp[applicationId] ?? [], [envsByApp, applicationId]);

  useEffect(() => {
    if (!applicationId && apps.length > 0) {
      setApplicationId(apps[0].id);
    }
  }, [apps]);

  useEffect(() => {
    if (envs.length > 0 && !envs.find((e) => e.id === environmentId)) {
      setEnvironmentId(envs[0].id);
    }
  }, [envs]);

  const handleDropdownChange = useCallback(
    (value: string) => {
      const [type, id] = value.split(":");
      if (type === "env") {
        // Find which app owns this environment
        for (const app of apps) {
          const appEnvs = envsByApp[app.id] ?? [];
          if (appEnvs.some((e) => e.id === id)) {
            if (app.id !== applicationId) {
              setApplicationId(app.id);
            }
            setEnvironmentId(id);
            break;
          }
        }
      }
    },
    [apps, envsByApp, applicationId],
  );

  const Dropdown = useMemo<React.FC>(
    () =>
      function Dropdown() {
        return (
          <List.Dropdown
            tooltip="Select Environment"
            onChange={handleDropdownChange}
            value={environmentId ? `env:${environmentId}` : undefined}
          >
            {apps.map((app) => (
              <List.Dropdown.Section key={app.id} title={app.attributes.name}>
                {(envsByApp[app.id] ?? []).map((env) => (
                  <List.Dropdown.Item key={env.id} title={env.attributes.name} value={`env:${env.id}`} />
                ))}
              </List.Dropdown.Section>
            ))}
          </List.Dropdown>
        );
      },
    [handleDropdownChange, environmentId, apps, envsByApp],
  );

  return {
    applicationId,
    environmentId,
    applications: apps,
    environments: envs,
    isLoading: appsLoading,
    setApplicationId,
    setEnvironmentId,
    Dropdown,
  };
}
