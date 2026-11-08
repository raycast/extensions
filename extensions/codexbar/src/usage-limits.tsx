import { Action, ActionPanel, Color, Icon, LaunchProps, List, environment } from "@raycast/api";
import { useState } from "react";
import { UsageActions, UsageErrorView, UsageLaunchContext, useUsage } from "./components/use-usage";
import {
  PercentMode,
  clampPercent,
  formatCurrency,
  formatDuration,
  formatResetIn,
  formatTokens,
  percentLabel,
} from "./lib/format";
import { gaugeMarkdown } from "./lib/gauge";
import { windowGauge } from "./lib/limits";
import { computePace, paceSummary } from "./lib/pace";
import { LimitWindow, ProviderUsage } from "./lib/types";
import { limitIcon, severityColor } from "./lib/ui";

function updatedLabel(date: Date | undefined, now: Date): string | undefined {
  if (!date) return undefined;
  return `Updated ${formatDuration(now.getTime() - date.getTime())} ago`;
}

function paceAccessory(window: LimitWindow, now: Date): List.Item.Accessory | undefined {
  const pace = computePace(window, now);
  if (!pace) return undefined;
  if (!pace.willLastToReset && pace.runsOutAt) {
    const left = pace.runsOutAt.getTime() - now.getTime();
    return {
      tag: { value: left <= 0 ? "Exhausted" : `Runs out in ${formatDuration(left)}`, color: Color.Red },
      tooltip: `At the current rate this limit runs out before it resets (${paceSummary(pace)})`,
    };
  }
  return { text: paceSummary(pace), tooltip: `Expected ${pace.expectedUsedPercent}% used by now` };
}

function WindowDetail(props: { usage: ProviderUsage; window: LimitWindow; mode: PercentMode; now: Date }) {
  const { usage, window, mode, now } = props;
  const pace = computePace(window, now);
  const used = clampPercent(window.usedPercent);
  const markdown = gaugeMarkdown([windowGauge(window, mode, now)], environment.appearance);
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={usage.name} text={usage.plan} />
          <List.Item.Detail.Metadata.TagList title="Remaining">
            <List.Item.Detail.Metadata.TagList.Item
              text={`${Math.round(100 - used)}%`}
              color={severityColor(window.usedPercent)}
            />
          </List.Item.Detail.Metadata.TagList>
          <List.Item.Detail.Metadata.Label title="Used" text={`${Math.round(used)}%`} />
          {window.resetsAt && (
            <List.Item.Detail.Metadata.Label
              title="Resets"
              text={`${window.resetsAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} (${formatResetIn(window.resetsAt, now)?.replace("Resets in ", "in ")})`}
            />
          )}
          {pace && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label title="Pace" text={paceSummary(pace)} />
              <List.Item.Detail.Metadata.Label title="Expected by Now" text={`${pace.expectedUsedPercent}% used`} />
              <List.Item.Detail.Metadata.Label
                title="Lasts Until Reset"
                text={
                  pace.willLastToReset
                    ? "Yes"
                    : `No, runs out in ${formatDuration((pace.runsOutAt?.getTime() ?? now.getTime()) - now.getTime())}`
                }
              />
            </>
          )}
          {(usage.todayCost !== undefined || usage.last30DaysCost !== undefined) && (
            <List.Item.Detail.Metadata.Separator />
          )}
          {usage.todayCost !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="Today (API-Equivalent)"
              text={`${formatCurrency(usage.todayCost, usage.currency)} · ${formatTokens(usage.todayTokens)} tokens`}
            />
          )}
          {usage.last30DaysCost !== undefined && (
            <List.Item.Detail.Metadata.Label
              title="30 Days (API-Equivalent)"
              text={`${formatCurrency(usage.last30DaysCost, usage.currency)} · ${formatTokens(usage.last30DaysTokens)} tokens`}
            />
          )}
          {usage.updatedAt && (
            <List.Item.Detail.Metadata.Label
              title="Updated"
              text={`${formatDuration(now.getTime() - usage.updatedAt.getTime())} ago (${usage.source === "app" ? "CodexBar app" : "CLI refresh"})`}
            />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ launchContext?: UsageLaunchContext }>) {
  const { data, all, isLoading, error, refresh, mode, reloadLayout } = useUsage(props.launchContext?.provider);
  const [showingDetail, setShowingDetail] = useState(true);
  const now = new Date();
  const actionsFor = (usage?: ProviderUsage) => (
    <UsageActions
      data={data}
      all={all}
      onRefresh={refresh}
      onLayoutChange={reloadLayout}
      quicklinkFor={usage ? [usage] : []}
    />
  );
  const actions = actionsFor();

  if (error && !data?.length) return <UsageErrorView error={error} data={data} onRefresh={refresh} />;

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail} searchBarPlaceholder="Filter providers and limits">
      <List.EmptyView
        icon={Icon.Gauge}
        title="No Limits to Show"
        description="Enable a provider in CodexBar, or show hidden ones with Manage Providers (⌘⇧L)."
        actions={<ActionPanel>{actions}</ActionPanel>}
      />
      {(data ?? []).map((usage) => (
        <List.Section
          key={usage.provider}
          title={usage.name}
          subtitle={[usage.plan, showingDetail ? undefined : updatedLabel(usage.updatedAt, now)]
            .filter(Boolean)
            .join(" · ")}
        >
          {usage.error ? (
            <List.Item
              title="Unavailable"
              subtitle={showingDetail ? undefined : usage.error}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.SecondaryText }}
              keywords={[usage.name, usage.provider]}
              detail={<List.Item.Detail markdown={`## ${usage.name}\n\n${usage.error}`} />}
              actions={<ActionPanel>{actions}</ActionPanel>}
            />
          ) : usage.windows.length === 0 ? (
            <List.Item
              title="No limits reported"
              icon={{ source: Icon.Minus, tintColor: Color.SecondaryText }}
              keywords={[usage.name, usage.provider]}
              actions={<ActionPanel>{actions}</ActionPanel>}
            />
          ) : (
            usage.windows.map((window) => {
              const pace = paceAccessory(window, now);
              return (
                <List.Item
                  key={`${usage.provider}-${window.id}`}
                  title={window.title}
                  subtitle={showingDetail ? undefined : formatResetIn(window.resetsAt, now)}
                  icon={limitIcon(window.usedPercent, mode)}
                  keywords={[usage.name, usage.provider]}
                  accessories={
                    showingDetail
                      ? [{ text: percentLabel(window.usedPercent, mode) }]
                      : [
                          ...(pace ? [pace] : []),
                          {
                            tag: {
                              value: percentLabel(window.usedPercent, mode),
                              color: severityColor(window.usedPercent),
                            },
                          },
                        ]
                  }
                  detail={<WindowDetail usage={usage} window={window} mode={mode} now={now} />}
                  actions={
                    <ActionPanel>
                      <Action
                        title={showingDetail ? "Hide Details" : "Show Details"}
                        icon={Icon.Sidebar}
                        onAction={() => setShowingDetail((value) => !value)}
                      />
                      {actionsFor(usage)}
                    </ActionPanel>
                  }
                />
              );
            })
          )}
        </List.Section>
      ))}
    </List>
  );
}
