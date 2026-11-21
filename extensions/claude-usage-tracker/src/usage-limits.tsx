import { Action, ActionPanel, Color, Icon, LaunchProps, List, environment } from "@raycast/api";
import { useState } from "react";
import { UsageActions, UsageErrorView, UsageLaunchContext, staleMessage, useUsage } from "./components/use-usage";
import { PercentMode, clampPercent, formatCurrency, formatDuration, formatResetIn, percentLabel } from "./lib/format";
import { gaugeMarkdown } from "./lib/gauge";
import { windowGauge } from "./lib/limits";
import { computePace, paceSummary } from "./lib/pace";
import { isStale } from "./lib/profiles";
import { LimitWindow, ProfileUsage } from "./lib/types";
import { limitIcon, severityColor } from "./lib/ui";

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

function WindowDetail(props: { usage: ProfileUsage; window: LimitWindow; mode: PercentMode; now: Date }) {
  const { usage, window, mode, now } = props;
  const pace = computePace(window, now);
  const used = clampPercent(window.usedPercent);
  const stale = isStale(usage, now);
  const gauge = windowGauge(window, mode, now);
  const markdown = gaugeMarkdown([gauge], environment.appearance, true);
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
          {window.resetsAt ? (
            <List.Item.Detail.Metadata.Label
              title="Resets"
              text={`${window.resetsAt.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} (${formatResetIn(window.resetsAt, now)?.replace("Resets in ", "in ")})`}
            />
          ) : (
            window.id === "session" && <List.Item.Detail.Metadata.Label title="Resets" text="No active session" />
          )}
          {pace && (
            <>
              <List.Item.Detail.Metadata.Separator />
              <List.Item.Detail.Metadata.Label
                title={mode === "used" ? "Time Elapsed" : "Time Left"}
                text={`${gauge.time}% of the window (inner ring)`}
              />
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
          <List.Item.Detail.Metadata.Separator />
          {usage.extra && (
            <List.Item.Detail.Metadata.Label
              title="Extra Usage"
              text={`${formatCurrency(usage.extra.used, usage.extra.currency)} of ${formatCurrency(usage.extra.limit, usage.extra.currency)}`}
            />
          )}
          <List.Item.Detail.Metadata.Label
            title="Updated"
            text={
              usage.updatedAt ? `${formatDuration(now.getTime() - usage.updatedAt.getTime())} ago` : "Never updated"
            }
            icon={stale ? { source: Icon.Warning, tintColor: Color.Orange } : undefined}
          />
          {stale && <List.Item.Detail.Metadata.Label title="" text="Open Claude Usage to get fresh numbers" />}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

export default function Command(props: LaunchProps<{ launchContext?: UsageLaunchContext }>) {
  const { data, all, isLoading, error, reload, mode, reloadLayout } = useUsage(props.launchContext?.profile);
  const [showingDetail, setShowingDetail] = useState(true);
  const now = new Date();
  const actionsFor = (usage?: ProfileUsage, standalone = false) => (
    <UsageActions
      data={data}
      all={all}
      onReload={reload}
      onLayoutChange={reloadLayout}
      quicklinkFor={usage ? [usage] : []}
      standalone={standalone}
    />
  );

  if (error && !data?.length) return <UsageErrorView error={error} onReload={reload} />;

  return (
    <List isLoading={isLoading} isShowingDetail={showingDetail} searchBarPlaceholder="Filter profiles and limits">
      <List.EmptyView
        icon={Icon.Gauge}
        title="No Limits to Show"
        description="Every profile is hidden. Show one with Manage Profiles (⌘⇧L)."
        actions={<ActionPanel>{actionsFor(undefined, true)}</ActionPanel>}
      />
      {(data ?? []).map((usage) => {
        const stale = isStale(usage, now);
        return (
          <List.Section
            key={usage.profile}
            title={usage.name}
            subtitle={[usage.plan, stale ? `⚠ ${staleMessage(usage, now)}` : undefined].filter(Boolean).join(" · ")}
          >
            {usage.windows.length === 0 ? (
              <List.Item
                title="No limits saved yet"
                subtitle={showingDetail ? undefined : "Open Claude Usage and let it refresh"}
                icon={{ source: Icon.Minus, tintColor: Color.SecondaryText }}
                keywords={[usage.name]}
                detail={
                  <List.Item.Detail
                    markdown={`## ${usage.name}\n\nClaude Usage has not saved any limits for this profile yet. Open the app and let it refresh once.`}
                  />
                }
                actions={<ActionPanel>{actionsFor(usage, true)}</ActionPanel>}
              />
            ) : (
              usage.windows.map((window) => {
                const pace = paceAccessory(window, now);
                return (
                  <List.Item
                    key={`${usage.profile}-${window.id}`}
                    title={window.title}
                    subtitle={
                      showingDetail
                        ? percentLabel(window.usedPercent, mode)
                        : (formatResetIn(window.resetsAt, now) ??
                          (window.id === "session" ? "No active session" : undefined))
                    }
                    icon={limitIcon(window.usedPercent, mode)}
                    keywords={[usage.name, ...(usage.plan ? [usage.plan] : [])]}
                    accessories={
                      showingDetail
                        ? undefined
                        : [
                            ...(stale
                              ? [
                                  {
                                    icon: { source: Icon.Warning, tintColor: Color.Orange },
                                    tooltip: `${staleMessage(usage, now)}: open Claude Usage to get fresh numbers`,
                                  },
                                ]
                              : []),
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
        );
      })}
    </List>
  );
}
