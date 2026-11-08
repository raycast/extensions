import { ActionPanel, Detail, LaunchProps, environment } from "@raycast/api";
import { UsageActions, UsageErrorView, UsageLaunchContext, useUsage } from "./components/use-usage";
import { PercentMode, formatCurrency, formatDuration, formatResetIn, formatTokens, percentLabel } from "./lib/format";
import { gaugeMarkdown } from "./lib/gauge";
import { windowGauge } from "./lib/limits";
import { computePace, paceSummary } from "./lib/pace";
import { ProviderUsage } from "./lib/types";
import { severityColor } from "./lib/ui";

function providerMarkdown(usage: ProviderUsage, mode: PercentMode, now: Date): string {
  const heading = `## ${usage.name}${usage.plan ? ` · ${usage.plan}` : ""}`;
  if (usage.error) return `${heading}\n\n_${usage.error}_`;
  if (usage.windows.length === 0) return `${heading}\n\n_No limits reported._`;
  const gauges = usage.windows.map((window) => windowGauge(window, mode, now));
  return `${heading}\n\n${gaugeMarkdown(gauges, environment.appearance)}`;
}

export default function Command(props: LaunchProps<{ launchContext?: UsageLaunchContext }>) {
  const only = props.launchContext?.provider;
  const { data, all, isLoading, error, refresh, mode, reloadLayout } = useUsage(only);
  const now = new Date();

  if (error && !data?.length) return <UsageErrorView error={error} data={data} onRefresh={refresh} />;

  const providers = data ?? [];
  const markdown =
    providers.length > 0
      ? providers.map((usage) => providerMarkdown(usage, mode, now)).join("\n\n---\n\n")
      : isLoading
        ? ""
        : only
          ? `## No data for ${only}\n\nEnable it in CodexBar, then press ⌘R to refresh.`
          : "## No providers to show\n\nEnable a provider in CodexBar, or show hidden ones with Manage Providers (⌘⇧L).";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={only && providers[0] ? `CodexBar · ${providers[0].name}` : undefined}
      markdown={markdown}
      metadata={
        providers.some((usage) => !usage.error && usage.windows.length > 0) ? (
          <Detail.Metadata>
            {providers
              .filter((usage) => !usage.error && usage.windows.length > 0)
              .map((usage) => (
                <Detail.Metadata.TagList key={`${usage.provider}-head`} title={usage.name}>
                  {usage.windows.map((window) => (
                    <Detail.Metadata.TagList.Item
                      key={window.id}
                      text={`${window.title} ${percentLabel(window.usedPercent, mode)}`}
                      color={severityColor(window.usedPercent)}
                    />
                  ))}
                </Detail.Metadata.TagList>
              ))}
            <Detail.Metadata.Separator />
            {providers.flatMap((usage) =>
              usage.error
                ? []
                : usage.windows.map((window) => {
                    const pace = computePace(window, now);
                    const reset = formatResetIn(window.resetsAt, now);
                    return (
                      <Detail.Metadata.Label
                        key={`${usage.provider}-${window.id}`}
                        title={`${usage.name} · ${window.title}`}
                        text={[reset, pace ? paceSummary(pace) : undefined].filter(Boolean).join(" · ")}
                      />
                    );
                  }),
            )}
            {providers.some((usage) => usage.todayCost !== undefined) && <Detail.Metadata.Separator />}
            {providers
              .filter((usage) => usage.todayCost !== undefined)
              .map((usage) => (
                <Detail.Metadata.Label
                  key={`${usage.provider}-cost`}
                  title={`${usage.name} Today (API-Equivalent)`}
                  text={`${formatCurrency(usage.todayCost, usage.currency)} · ${formatTokens(usage.todayTokens)} tokens`}
                />
              ))}
            {providers[0]?.updatedAt && (
              <Detail.Metadata.Label
                title="Updated"
                text={`${formatDuration(now.getTime() - providers[0].updatedAt.getTime())} ago`}
              />
            )}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <UsageActions
            data={data}
            all={all}
            onRefresh={refresh}
            onLayoutChange={reloadLayout}
            quicklinkFor={only ? [] : (all ?? [])}
          />
        </ActionPanel>
      }
    />
  );
}
