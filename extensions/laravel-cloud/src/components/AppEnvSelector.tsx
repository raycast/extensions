import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { listApplications } from "../api/applications";
import { listEnvironments } from "../api/environments";
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

  const apps = appsData?.data ?? [];

  useEffect(() => {
    if (!applicationId && apps.length > 0) {
      setApplicationId(apps[0].id);
    }
  }, [apps]);

  const { data: envsData, isLoading: envsLoading } = useCachedPromise(
    (appId: string) => listEnvironments(appId),
    [applicationId],
    { execute: !!applicationId },
  );

  const envs = envsData?.data ?? [];

  useEffect(() => {
    if (envs.length > 0 && !envs.find((e) => e.id === environmentId)) {
      setEnvironmentId(envs[0].id);
    }
  }, [envs]);

  const handleDropdownChange = useCallback((value: string) => {
    const [type, id] = value.split(":");
    if (type === "app") {
      setApplicationId(id);
      setEnvironmentId("");
    } else if (type === "env") {
      setEnvironmentId(id);
    }
  }, []);

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
                {(applicationId === app.id ? envs : []).map((env) => (
                  <List.Dropdown.Item key={env.id} title={env.attributes.name} value={`env:${env.id}`} />
                ))}
                {applicationId !== app.id && <List.Dropdown.Item title="Select..." value={`app:${app.id}`} />}
              </List.Dropdown.Section>
            ))}
          </List.Dropdown>
        );
      },
    [handleDropdownChange, environmentId, apps, applicationId, envs],
  );

  return {
    applicationId,
    environmentId,
    applications: apps,
    environments: envs,
    isLoading: appsLoading || envsLoading,
    setApplicationId,
    setEnvironmentId,
    Dropdown,
  };
}
