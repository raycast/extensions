import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { loadStartupData, type HealthSnapshot } from "../lib/health";
import { mdCode, parseErrorMessage } from "../lib/utils";

export function HealthDetail() {
  const { data, isLoading, error, revalidate } = usePromise(loadStartupData);

  const health = data as HealthSnapshot | null;

  const md = health
    ? (() => {
        const overallHealthy = health.optMounted && health.optWritable && health.xkeenAvailable;
        return ["# Health Check", "", `**Overall:** ${overallHealthy ? "✅ Healthy" : "⚠️ Needs Attention"}`].join(
          "\n",
        );
      })()
    : mdCode("Health Check Error", error ? parseErrorMessage(error) : "No data");

  return (
    <Detail
      isLoading={isLoading}
      markdown={md}
      metadata={
        health && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Active Profile" text={health.activeProfile} />
            <Detail.Metadata.Label title="Free Space (/opt)" text={`${health.optFreeMb} MB`} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="/opt mounted" text={health.optMounted ? "✅ OK" : "❌ FAIL"} />
            <Detail.Metadata.Label title="/opt writable" text={health.optWritable ? "✅ OK" : "❌ FAIL"} />
            <Detail.Metadata.Label title="xkeen binary" text={health.xkeenAvailable ? "✅ OK" : "❌ FAIL"} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Uptime" text={health.uptime} />
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          <Action title="Refresh" icon={Icon.RotateClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
