/**
 * Deployment Status Menu Bar Command
 *
 * Always-visible deployment vitals: call volume and failures over the last
 * hour, refreshed in the background. Turns red when functions are failing.
 */

import {
  Color,
  Icon,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useConvexAuth } from "./hooks/useConvexAuth";
import { getDeploymentUrl } from "./lib/api";
import {
  fetchDeploymentHealth,
  latestValue,
  maxValue,
  sumSeries,
  type MetricsAuth,
} from "./lib/metrics";

export default function MenuBarStatusCommand() {
  const {
    session,
    selectedContext,
    deployKeyConfig,
    isLoading: authLoading,
  } = useConvexAuth();

  const deploymentName =
    selectedContext.deploymentName ?? deployKeyConfig?.deploymentName ?? null;

  const auth: MetricsAuth | null = deployKeyConfig
    ? {
        deploymentUrl: deployKeyConfig.deploymentUrl,
        token: deployKeyConfig.deployKey,
      }
    : session?.accessToken && selectedContext.deploymentName
      ? {
          deploymentUrl:
            selectedContext.deploymentUrl ??
            getDeploymentUrl(selectedContext.deploymentName),
          token: session.accessToken,
        }
      : null;

  const { data, isLoading } = useCachedPromise(
    async (metricsAuth: MetricsAuth) => fetchDeploymentHealth(metricsAuth),
    [auth as MetricsAuth],
    { execute: auth !== null, keepPreviousData: true },
  );

  // null = unavailable (fetch failed or still loading) — never render that
  // as a healthy green state
  const totalCalls = data?.callCountTopK
    ? Math.round(sumSeries(data.callCountTopK))
    : null;
  const peakFailure = data?.failureTopK ? maxValue(data.failureTopK) : null;
  const failing = (peakFailure ?? 0) > 0;
  const healthUnknown = peakFailure === null;
  const currentLag = data?.schedulerLag
    ? (latestValue(data.schedulerLag) ?? 0)
    : null;

  if (!auth) {
    return (
      <MenuBarExtra
        icon={Icon.Cloud}
        title=""
        tooltip="Convex: no deployment selected"
        isLoading={authLoading}
      >
        <MenuBarExtra.Item
          title="No Deployment Selected"
          subtitle="Open 'Manage Projects' to pick one"
          onAction={() =>
            launchCommand({
              name: "switch-project",
              type: LaunchType.UserInitiated,
            })
          }
        />
      </MenuBarExtra>
    );
  }

  const statusIcon = healthUnknown
    ? { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText }
    : failing
      ? { source: Icon.XMarkCircle, tintColor: Color.Red }
      : { source: Icon.CheckCircle, tintColor: Color.Green };

  return (
    <MenuBarExtra
      icon={statusIcon}
      title={
        failing && peakFailure !== null
          ? `${peakFailure.toFixed(0)}%`
          : undefined
      }
      tooltip={`Convex · ${deploymentName ?? ""}`}
      isLoading={isLoading}
    >
      <MenuBarExtra.Section title={deploymentName ?? "Deployment"}>
        <MenuBarExtra.Item
          icon={Icon.Bolt}
          title={
            totalCalls === null
              ? "Call volume unavailable"
              : `${totalCalls} calls in the last hour`
          }
          onAction={openHealth}
        />
        <MenuBarExtra.Item
          icon={statusIcon}
          title={
            healthUnknown
              ? "Failure data unavailable"
              : failing
                ? `Peak failure rate ${peakFailure!.toFixed(1)}%`
                : "No failures"
          }
          onAction={openHealth}
        />
        <MenuBarExtra.Item
          icon={Icon.Clock}
          title={
            currentLag === null
              ? "Scheduler lag unavailable"
              : `Scheduler lag ${currentLag.toFixed(0)}s`
          }
          onAction={openHealth}
        />
        {data?.state && data.state !== "running" && (
          <MenuBarExtra.Item
            icon={{ source: Icon.Warning, tintColor: Color.Orange }}
            title={`Deployment ${data.state}`}
            onAction={openHealth}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          icon={Icon.LineChart}
          title="Open Deployment Health"
          onAction={openHealth}
        />
        <MenuBarExtra.Item
          icon={Icon.Globe}
          title="Open Dashboard"
          onAction={() =>
            open(`https://dashboard.convex.dev/d/${deploymentName ?? ""}`)
          }
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

function openHealth() {
  return launchCommand({
    name: "deployment-health",
    type: LaunchType.UserInitiated,
  });
}
