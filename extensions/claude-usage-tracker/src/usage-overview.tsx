import { ActionPanel, Detail, LaunchProps, environment } from "@raycast/api";
import { UsageActions, UsageErrorView, UsageLaunchContext, staleMessage, useUsage } from "./components/use-usage";
import { PercentMode, formatCurrency, formatDuration, formatResetIn, percentLabel } from "./lib/format";
import { gaugeMarkdown } from "./lib/gauge";
import { windowGauge } from "./lib/limits";
import { computePace, paceSummary } from "./lib/pace";
import { isStale } from "./lib/profiles";
import { ProfileUsage } from "./lib/types";
import { severityColor } from "./lib/ui";

function profileMarkdown(usage: ProfileUsage, mode: PercentMode, now: Date): string {
  const heading = `## ${usage.name}${usage.plan ? ` · ${usage.plan}` : ""}`;
  if (usage.windows.length === 0) {
    return `${heading}\n\n_No limits saved yet. Open Claude Usage and let it refresh once._`;
  }
  const gauges = usage.windows.map((window) => windowGauge(window, mode, now));
  const warning = isStale(usage, now)
    ? `\n\n> ⚠️ ${staleMessage(usage, now)}. Open Claude Usage to get fresh numbers.`
    : "";
  return `${heading}${warning}\n\n${gaugeMarkdown(gauges, environment.appearance)}`;
}

export default function Command(props: LaunchProps<{ launchContext?: UsageLaunchContext }>) {
  const only = props.launchContext?.profile;
  const { data, all, isLoading, error, reload, mode, reloadLayout } = useUsage(only);
  const now = new Date();

  if (error && !data?.length) return <UsageErrorView error={error} onReload={reload} />;

  const profiles = data ?? [];
  const withLimits = profiles.filter((usage) => usage.windows.length > 0);
  const single = profiles.length === 1;
  const markdown =
    profiles.length > 0
      ? profiles.map((usage) => profileMarkdown(usage, mode, now)).join("\n\n---\n\n")
      : isLoading
        ? ""
        : only
          ? "## Profile not found\n\nThis quicklink points to a profile that no longer exists in Claude Usage."
          : "## No profiles to show\n\nEvery profile is hidden. Show one with Manage Profiles (⌘⇧L).";

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        withLimits.length > 0 ? (
          <Detail.Metadata>
            {withLimits.map((usage) => (
              <Detail.Metadata.TagList key={`${usage.profile}-head`} title={single ? "Limits" : usage.name}>
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
            {withLimits.flatMap((usage) =>
              usage.windows.map((window) => {
                const pace = computePace(window, now);
                const reset =
                  formatResetIn(window.resetsAt, now) ?? (window.id === "session" ? "No active session" : undefined);
                return (
                  <Detail.Metadata.Label
                    key={`${usage.profile}-${window.id}`}
                    title={single ? window.title : `${usage.name} · ${window.title}`}
                    text={[reset, pace ? paceSummary(pace) : undefined].filter(Boolean).join(" · ")}
                  />
                );
              }),
            )}
            <Detail.Metadata.Separator />
            {withLimits
              .filter((usage) => usage.extra)
              .map((usage) => (
                <Detail.Metadata.Label
                  key={`${usage.profile}-extra`}
                  title={single ? "Extra Usage" : `${usage.name} · Extra Usage`}
                  text={`${formatCurrency(usage.extra?.used, usage.extra?.currency)} of ${formatCurrency(usage.extra?.limit, usage.extra?.currency)}`}
                />
              ))}
            {withLimits.map((usage) => (
              <Detail.Metadata.Label
                key={`${usage.profile}-updated`}
                title={single ? "Updated" : `${usage.name} · Updated`}
                text={
                  usage.updatedAt ? `${formatDuration(now.getTime() - usage.updatedAt.getTime())} ago` : "Never updated"
                }
              />
            ))}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <UsageActions
            data={data}
            all={all}
            onReload={reload}
            onLayoutChange={reloadLayout}
            quicklinkFor={only ? [] : (all ?? [])}
            standalone
          />
        </ActionPanel>
      }
    />
  );
}
