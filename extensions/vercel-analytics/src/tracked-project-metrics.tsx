import { Icon, LaunchType, MenuBarExtra, getPreferenceValues, launchCommand } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";

import { getTrackedProject, TrackedProject } from "./storage";
import { getProjectTrafficCoreMetrics, ProjectTrafficCoreMetrics } from "./vercel";

function formatNumber(value: number): string {
  return Intl.NumberFormat("en-US").format(value);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Unexpected error";
}

export default function TrackedProjectMetricsCommand() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [trackedProject, setTrackedProject] = useState<TrackedProject | null>(null);
  const [metrics, setMetrics] = useState<ProjectTrafficCoreMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedMetricsRef = useRef(false);

  useEffect(() => {
    hasLoadedMetricsRef.current = metrics !== null;
  }, [metrics]);

  const refresh = useCallback(async () => {
    const shouldShowLoadingState = !hasLoadedMetricsRef.current;
    if (shouldShowLoadingState) {
      setIsLoading(true);
    }

    try {
      const preferences = getPreferenceValues<{ apiKey?: string }>();
      const storedApiKey = preferences.apiKey?.trim() || null;
      const storedProject = await getTrackedProject();
      setApiKey(storedApiKey);
      setTrackedProject(storedProject);

      if (!storedApiKey) {
        setMetrics(null);
        setError("Missing Vercel API key");
        return;
      }

      if (!storedProject) {
        setMetrics(null);
        setError("No tracked project selected");
        return;
      }

      const loadedMetrics = await getProjectTrafficCoreMetrics(storedApiKey, {
        id: storedProject.id,
        name: storedProject.name,
        accountId: storedProject.accountId,
      });
      setMetrics(loadedMetrics);
      setError(null);
    } catch (refreshError) {
      setError(getErrorMessage(refreshError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Safety net: avoid indefinite loading state if any request hangs unexpectedly.
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setError((current) => current ?? "Timed out while loading metrics");
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const title = metrics ? formatNumber(metrics.visitors) : "--";
  const tooltip = trackedProject ? `${trackedProject.name} analytics` : "Tracked Project Metrics";

  return (
    <MenuBarExtra isLoading={isLoading} icon={Icon.BarChart} title={title} tooltip={tooltip}>
      <MenuBarExtra.Section title="Tracked Project">
        <MenuBarExtra.Item title={trackedProject ? trackedProject.name : "No project selected"} />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Traffic Core">
        <MenuBarExtra.Item title="Visitors" subtitle={metrics ? formatNumber(metrics.visitors) : "--"} />
        <MenuBarExtra.Item title="Period" subtitle={metrics ? metrics.periodLabel : "Last 7 days"} />
      </MenuBarExtra.Section>

      {error ? <MenuBarExtra.Item title="Status" subtitle={error} /> : null}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Refresh Metrics" onAction={refresh} />
        <MenuBarExtra.Item
          title={apiKey ? "Change API Key / Project" : "Set API Key and Project"}
          onAction={() => launchCommand({ name: "add-tracker", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
