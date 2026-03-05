import {
  MenuBarExtra,
  getPreferenceValues,
  openCommandPreferences,
  launchCommand,
  LaunchType,
  Icon,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { Environment, Deployment } from "./types";
import { getEnvironments, getLatestDeployments } from "./storage";
import { COLOR_MAP, shortRef, formatDate } from "./utils";

interface Preferences {
  enabled: boolean;
}

export default function DeploymentStatusMenuBar() {
  const { enabled } = getPreferenceValues<Preferences>();

  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [latestMap, setLatestMap] = useState<Map<string, Deployment>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    Promise.all([getEnvironments(), getLatestDeployments()]).then(
      ([envs, latest]) => {
        setEnvironments(envs);
        setLatestMap(latest);
        setIsLoading(false);
      },
    );
  }, []);

  if (!enabled) return null;

  const deployedCount = environments.filter((e) => latestMap.has(e.id)).length;
  const menuBarTitle =
    environments.length > 0
      ? `${deployedCount}/${environments.length}`
      : undefined;

  return (
    <MenuBarExtra
      icon={{ source: Icon.Globe }}
      title={menuBarTitle}
      tooltip="Deployment Status"
      isLoading={isLoading}
    >
      {!isLoading && environments.length === 0 && (
        <MenuBarExtra.Item title="No environments configured" />
      )}

      {environments.map((env) => {
        const latest = latestMap.get(env.id);
        return (
          <MenuBarExtra.Item
            key={env.id}
            icon={{ source: Icon.Circle, tintColor: COLOR_MAP[env.color] }}
            title={env.name}
            subtitle={latest ? shortRef(latest.ref) : "—"}
            tooltip={
              latest
                ? `${latest.ref}\n${formatDate(latest.deployedAt)}`
                : "No deployments"
            }
            onAction={() =>
              launchCommand({
                name: "deployment-status",
                type: LaunchType.UserInitiated,
              })
            }
          />
        );
      })}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Log New Deployment"
          icon={Icon.Plus}
          shortcut={{ modifiers: ["cmd"], key: "n" }}
          onAction={() =>
            launchCommand({
              name: "add-deployment",
              type: LaunchType.UserInitiated,
            })
          }
        />
        <MenuBarExtra.Item
          title="Open Deployment Status"
          icon={Icon.List}
          onAction={() =>
            launchCommand({
              name: "deployment-status",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Disable Menu Bar"
          icon={Icon.XMarkCircle}
          onAction={openCommandPreferences}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
