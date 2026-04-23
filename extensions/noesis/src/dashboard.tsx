import React, { useEffect, useState } from "react";
import { Action, Color, Icon, List } from "@raycast/api";
import {
  EngineExecutionForm,
  WorkflowExecutionForm,
} from "./components/execution-forms";
import { NoesisActionPanel } from "./components/noesis-actions";
import {
  EngineDetailView,
  EnginesBrowser,
  ReadingDetailView,
  ReadingsBrowser,
  WorkflowDetailView,
  WorkflowsBrowser,
} from "./components/noesis-browsers";
import { OnboardingForm } from "./components/onboarding-form";
import { ProfileForm } from "./components/profile-form";
import {
  formatAbsoluteTime,
  formatCompactCount,
  formatCount,
  formatHostLabel,
  formatPhaseBadge,
  formatPhaseLabel,
  formatRateLimit,
  formatReadingSubtitle,
  formatRelativeTime,
  formatTimeUntil,
  formatUptime,
  formatUsageWindow,
  getCacheColor,
  getHealthColor,
  getPhaseColor,
  truncate,
} from "./lib/formatters";
import {
  getPreferredInsight,
  getPulseModeLabel,
} from "./lib/menu-bar-insights";
import { openCommand } from "./lib/navigation";
import { readMenuBarSnapshot } from "./lib/queries";
import { getPulseModePreference } from "./lib/settings";
import { useDashboardSnapshot } from "./lib/use-dashboard-snapshot";
import {
  DashboardSnapshot,
  MenuBarInsightKind,
  MenuBarSnapshot,
} from "./lib/types";

export default function Dashboard() {
  const { snapshot, isLoading, error, reload } = useDashboardSnapshot();
  const [menuBarSnapshot, setMenuBarSnapshot] =
    useState<MenuBarSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!snapshot) {
      setMenuBarSnapshot(null);
      return;
    }

    void readMenuBarSnapshot()
      .then((nextSnapshot) => {
        if (!cancelled) {
          setMenuBarSnapshot(nextSnapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMenuBarSnapshot(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    snapshot?.timestamps.lastSyncAt,
    snapshot?.timestamps.profile,
    snapshot?.timestamps.readings,
  ]);

  if (snapshot && !snapshot.hasCredentials && snapshot.source === "empty") {
    return <OnboardingForm onSaved={() => reload(true)} />;
  }

  if (error && !snapshot) {
    return (
      <List navigationTitle="Tryambakam Noesis">
        <List.Item
          title="Unable to load Tryambakam Noesis"
          subtitle={error}
          actions={<NoesisActionPanel onRefresh={reload} hideDashboardAction />}
        />
      </List>
    );
  }

  const featuredEngines = snapshot ? getFeaturedEngines(snapshot) : [];
  const featuredWorkflows = snapshot ? getFeaturedWorkflows(snapshot) : [];
  const recentReadings = snapshot?.readings.slice(0, 6) ?? [];
  const totalReadingCount =
    snapshot?.readingStats.reduce((sum, entry) => sum + entry.count, 0) ?? 0;
  const maxWorkflowSpan = snapshot
    ? Math.max(...snapshot.workflows.map((workflow) => workflow.engineCount), 0)
    : 0;
  const pulseMode = getPulseModePreference();
  const pulseModeLabel = getPulseModeLabel(pulseMode);
  const currentPulse = getPreferredInsight(
    menuBarSnapshot?.insights ?? {},
    pulseMode,
  );
  const pulseKind = currentPulse?.kind ?? pulseMode;
  const pulseTitle =
    currentPulse?.title ?? getPulsePendingTitle(pulseModeLabel, snapshot);
  const pulseDetailSummary =
    currentPulse?.summary ?? getPulsePendingSummary(pulseModeLabel, snapshot);
  const pulseEngine =
    snapshot && currentPulse
      ? snapshot.engines.find((engine) => engine.id === currentPulse.engineId)
      : undefined;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Tryambakam Noesis"
      searchBarPlaceholder="Navigate Tryambakam Noesis"
    >
      {snapshot ? (
        <>
          <List.Section title="Launchpad">
            <List.Item
              icon={{
                source: Icon.PersonCircle,
                tintColor: snapshot.profile ? Color.Blue : Color.Orange,
              }}
              title={{
                value: "Profile Defaults",
                tooltip:
                  snapshot.profile?.fullName ??
                  "Set shared birth data, timezone, and reusable witness defaults.",
              }}
              keywords={[
                "profile",
                snapshot.profile?.fullName ?? "",
                snapshot.profile?.email ?? "",
                snapshot.profile?.timezone ?? "",
              ]}
              accessories={[
                {
                  tag: {
                    value: snapshot.profile ? "READY" : "SETUP",
                    color: snapshot.profile ? Color.Green : Color.Orange,
                  },
                },
                {
                  text: snapshot.profile?.timezone ?? "No TZ",
                  tooltip:
                    snapshot.profile?.timezone ?? "Timezone not configured",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Profile Defaults",
                    "",
                    "Maintain the shared witness identity once, then reuse it across engine and workflow execution forms.",
                    "",
                    snapshot.profile
                      ? `- Active operator: ${snapshot.profile.fullName}`
                      : "- No live profile cached yet. Onboarding or a refresh will pull it in once authenticated.",
                    snapshot.profile?.tier
                      ? `- Access tier: ${snapshot.profile.tier}`
                      : "- Access tier unknown",
                    snapshot.profile?.birthDate
                      ? `- Birth date: ${snapshot.profile.birthDate}`
                      : "- Birth date not set",
                    snapshot.profile?.timezone
                      ? `- Timezone: ${snapshot.profile.timezone}`
                      : "- Timezone not set",
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Edit Profile Defaults"
                    icon={Icon.Pencil}
                    target={<ProfileForm snapshot={snapshot} />}
                  />
                  <Action
                    title="Open Profile Command"
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "p" }}
                    onAction={() => openCommand("profile")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.Stars}
              title={{
                value: "Engine Console",
                tooltip:
                  "Run individual Selemene engines and inspect phase coverage.",
              }}
              keywords={["engines", "console", "catalog", "phases"]}
              accessories={[
                {
                  text: formatCompactCount(snapshot.engines.length, "E"),
                  tooltip: `${snapshot.engines.length} engines cached locally`,
                },
                {
                  text: formatCompactCount(totalReadingCount, "R"),
                  tooltip: `${totalReadingCount} cached readings across engine history`,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Engine Console",
                    "",
                    "Move through the Selemene engine catalog with phase grouping, execution entry points, and cached reading context.",
                    "",
                    `- ${formatCount(snapshot.engines.length, "engine")} in the current cache`,
                    `- ${formatCount(totalReadingCount, "reading")} represented across engine stats`,
                    "",
                    "Inside the engine console, Enter opens the execution form instead of refreshing the dashboard.",
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Open Engine Console"
                    icon={Icon.ArrowRightCircle}
                    target={
                      <EnginesBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                  <Action
                    title="Open Engines Command"
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => openCommand("engines")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.Network}
              title={{
                value: "Workflow Studio",
                tooltip:
                  "Inspect composite orchestration chains and launch multi-engine readings.",
              }}
              keywords={["workflows", "studio", "chains", "orchestration"]}
              accessories={[
                {
                  text: formatCompactCount(snapshot.workflows.length, "W"),
                  tooltip: `${snapshot.workflows.length} workflows cached locally`,
                },
                {
                  text: maxWorkflowSpan
                    ? formatCompactCount(maxWorkflowSpan, "E")
                    : "--",
                  tooltip: maxWorkflowSpan
                    ? `Largest workflow spans ${maxWorkflowSpan} engines`
                    : "No workflow span cached yet",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Workflow Studio",
                    "",
                    "Inspect Selemene orchestration chains in a dedicated browser with detail previews and direct execution drill-ins.",
                    "",
                    `- ${formatCount(snapshot.workflows.length, "workflow")} cached locally`,
                    `- Largest workflow spans ${maxWorkflowSpan} engines`,
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Open Workflow Studio"
                    icon={Icon.ArrowRightCircle}
                    target={
                      <WorkflowsBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                  <Action
                    title="Open Workflows Command"
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "w" }}
                    onAction={() => openCommand("workflows")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.Book}
              title={{
                value: "Reading Archive",
                tooltip:
                  "Inspect recent witness prompts, payloads, and cached outcomes.",
              }}
              keywords={["readings", "archive", "history", "results"]}
              accessories={[
                {
                  text: formatCompactCount(snapshot.readings.length, "R"),
                  tooltip: `${snapshot.readings.length} recent readings in local history`,
                },
                {
                  text: formatRelativeTime(snapshot.timestamps.readings),
                  tooltip: `Latest sync ${formatAbsoluteTime(snapshot.timestamps.readings)}`,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Reading Archive",
                    "",
                    "Traverse cached reading history with witness prompts, JSON excerpts, and structured metadata.",
                    "",
                    `- ${formatCount(snapshot.readings.length, "recent reading")} in the local history window`,
                    `- Latest sync landed ${formatRelativeTime(snapshot.timestamps.readings)}`,
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                  <Action.Push
                    title="Open Reading Archive"
                    icon={Icon.ArrowRightCircle}
                    target={
                      <ReadingsBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                  <Action
                    title="Open Readings Command"
                    icon={Icon.AppWindowList}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => openCommand("readings")}
                  />
                </NoesisActionPanel>
              }
            />
          </List.Section>

          <List.Section title="Command Center">
            <List.Item
              icon={{
                source: getPulseIcon(pulseKind),
                tintColor: getPulseColor(pulseKind),
              }}
              title={{
                value: pulseTitle,
                tooltip: [
                  pulseModeLabel,
                  pulseTitle,
                  currentPulse?.subtitle,
                  pulseDetailSummary,
                ]
                  .filter(Boolean)
                  .join("\n"),
              }}
              keywords={[
                pulseModeLabel,
                currentPulse?.engineId ?? "",
                pulseTitle,
                pulseDetailSummary,
              ]}
              accessories={[
                {
                  tag: {
                    value: pulseModeLabel,
                    color: getPulseColor(pulseKind),
                  },
                },
                {
                  text: currentPulse
                    ? formatTimeUntil(currentPulse.refreshAfter)
                    : snapshot.profile?.birthDate || pulseMode === "vedicClock"
                      ? "Sync"
                      : "Profile",
                  tooltip: currentPulse
                    ? `Refreshes in ${formatTimeUntil(currentPulse.refreshAfter)}`
                    : snapshot.profile?.birthDate || pulseMode === "vedicClock"
                      ? "Refresh the pulse cache to surface the current title."
                      : "Add birth data in Profile to unlock this pulse mode.",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    `# ${pulseTitle}`,
                    "",
                    currentPulse?.subtitle ?? pulseDetailSummary,
                    "",
                    `- Title mode: ${pulseModeLabel}`,
                    currentPulse?.subtitle
                      ? `- Window: ${currentPulse.subtitle}`
                      : "- Window: Waiting for a cached pulse snapshot",
                    `- Signal: ${pulseDetailSummary}`,
                    currentPulse
                      ? `- Cached: ${formatRelativeTime(currentPulse.fetchedAt)} (${formatAbsoluteTime(currentPulse.fetchedAt)})`
                      : "- Cached: No pulse snapshot stored yet",
                    currentPulse
                      ? `- Refreshes in: ${formatTimeUntil(currentPulse.refreshAfter)}`
                      : "- Refreshes in: Refresh after warming the pulse cache",
                    "",
                    "The menu bar title follows this row when the selected pulse mode has a cached reading.",
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Command Center"
                >
                  {pulseEngine ? (
                    <Action.Push
                      title="Run Pulse Engine"
                      icon={Icon.Play}
                      target={
                        <EngineExecutionForm
                          engine={pulseEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {pulseEngine ? (
                    <Action.Push
                      title="View Pulse Engine"
                      icon={Icon.ArrowRightCircle}
                      target={
                        <EngineDetailView
                          engine={pulseEngine}
                          snapshot={snapshot}
                        />
                      }
                    />
                  ) : null}
                  {!pulseEngine ? (
                    <Action.Push
                      title="Edit Profile"
                      icon={Icon.Pencil}
                      target={<ProfileForm snapshot={snapshot} />}
                    />
                  ) : null}
                  <Action.Push
                    title="Browse Engines"
                    icon={Icon.AppWindowList}
                    target={
                      <EnginesBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={{
                source: snapshot.hasCredentials ? Icon.Globe : Icon.Key,
                tintColor: snapshot.syncError
                  ? Color.Orange
                  : snapshot.health
                    ? getHealthColor(snapshot.health.status)
                    : snapshot.hasCredentials
                      ? Color.Green
                      : Color.SecondaryText,
              }}
              title={
                snapshot.hasCredentials
                  ? "Selemene Engine Ready"
                  : "Cached Mode Only"
              }
              keywords={[
                snapshot.baseUrl,
                formatHostLabel(snapshot.baseUrl),
                snapshot.health?.status ?? "",
                snapshot.syncError ?? "",
              ]}
              accessories={[
                {
                  tag: {
                    value: snapshot.hasCredentials
                      ? (snapshot.health?.status?.toUpperCase() ?? "LIVE")
                      : "OFFLINE",
                    color: snapshot.hasCredentials
                      ? snapshot.health
                        ? getHealthColor(snapshot.health.status)
                        : Color.Green
                      : Color.Orange,
                  },
                },
                {
                  text: formatHostLabel(snapshot.baseUrl),
                  tooltip: snapshot.baseUrl,
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Selemene Engine",
                    "",
                    snapshot.hasCredentials
                      ? "Live sync is active. Profile, catalog, and reading refreshes can pull directly from the Selemene Engine."
                      : "No live key is connected. The dashboard is operating from the local cache until the API Key command reconnects the engine.",
                    "",
                    `- Base URL: \`${snapshot.baseUrl}\``,
                    `- Access: ${snapshot.hasCredentials ? "API key connected" : "Cache only"}`,
                    snapshot.health
                      ? `- Service: ${snapshot.health.status}`
                      : "- Service: No live health snapshot cached",
                    snapshot.health
                      ? `- Version: ${snapshot.health.version}`
                      : "- Version: Unknown",
                    snapshot.health
                      ? `- Uptime: ${formatUptime(snapshot.health.uptimeSeconds)}`
                      : "- Uptime: Unknown",
                    snapshot.health
                      ? `- Catalog: ${snapshot.health.enginesLoaded} engines / ${snapshot.health.workflowsLoaded} workflows`
                      : `- Catalog cache: ${snapshot.engines.length} engines / ${snapshot.workflows.length} workflows`,
                    `- Rate limit: ${formatRateLimit(snapshot.rateLimit)}`,
                    snapshot.syncError
                      ? `- Sync issue: ${snapshot.syncError}`
                      : "- Sync issue: None",
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Command Center"
                >
                  <Action
                    title={
                      snapshot.hasCredentials
                        ? "Edit Access Key"
                        : "Connect Access Key"
                    }
                    icon={Icon.Key}
                    onAction={() => openCommand("api-key")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={{
                source: Icon.PersonCircle,
                tintColor: snapshot.profile ? Color.Blue : Color.Orange,
              }}
              title={snapshot.profile?.fullName ?? "Profile Defaults Pending"}
              keywords={[
                snapshot.profile?.email ?? "",
                snapshot.profile?.fullName ?? "",
                snapshot.profile?.timezone ?? "",
              ]}
              accessories={[
                {
                  text: snapshot.profile?.timezone ?? "No TZ",
                  tooltip: snapshot.profile?.timezone
                    ? `Timezone ${snapshot.profile.timezone}`
                    : "Timezone not set",
                },
                {
                  text: snapshot.profile?.tier ?? "Profile",
                  tooltip: snapshot.profile
                    ? `${snapshot.profile.tier} tier`
                    : "No live profile cached yet",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    `# ${snapshot.profile?.fullName ?? "Profile Defaults"}`,
                    "",
                    snapshot.profile
                      ? "Birth data and timezone are ready to prefill engine and workflow execution forms."
                      : "No profile is cached yet. Saving profile defaults will make the execution forms faster and unlock personal pulse modes.",
                    "",
                    snapshot.profile?.email
                      ? `- Email: ${snapshot.profile.email}`
                      : "- Email: Not cached",
                    snapshot.profile?.tier
                      ? `- Tier: ${snapshot.profile.tier}`
                      : "- Tier: Unknown",
                    snapshot.profile
                      ? `- Consciousness level: ${snapshot.profile.consciousnessLevel}`
                      : "- Consciousness level: Unknown",
                    snapshot.profile
                      ? `- Experience points: ${snapshot.profile.experiencePoints}`
                      : "- Experience points: Unknown",
                    snapshot.profile?.birthDate
                      ? `- Birth date: ${snapshot.profile.birthDate}`
                      : "- Birth date: Not set",
                    snapshot.profile?.birthTime
                      ? `- Birth time: ${snapshot.profile.birthTime}`
                      : "- Birth time: Not set",
                    snapshot.profile?.birthLocation?.name
                      ? `- Birth location: ${snapshot.profile.birthLocation.name}`
                      : snapshot.profile?.birthLocation?.latitude !==
                            undefined &&
                          snapshot.profile?.birthLocation?.longitude !==
                            undefined
                        ? `- Birth location: ${snapshot.profile.birthLocation.latitude}, ${snapshot.profile.birthLocation.longitude}`
                        : "- Birth location: Not set",
                    snapshot.profile?.timezone
                      ? `- Timezone: ${snapshot.profile.timezone}`
                      : "- Timezone: Not set",
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Command Center"
                >
                  <Action.Push
                    title="Edit Profile"
                    icon={Icon.Pencil}
                    target={<ProfileForm snapshot={snapshot} />}
                  />
                  <Action
                    title="Open Profile Command"
                    icon={Icon.AppWindowList}
                    onAction={() => openCommand("profile")}
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={Icon.BarChart}
              title="Usage Window"
              accessories={[
                {
                  text: snapshot.usage
                    ? formatCompactCount(snapshot.usage.daily.total, "D")
                    : "--",
                  tooltip: snapshot.usage
                    ? `Daily ${snapshot.usage.daily.total}`
                    : "No daily usage window cached yet",
                },
                {
                  text: snapshot.usage
                    ? formatCompactCount(snapshot.usage.monthly.total, "M")
                    : "--",
                  tooltip: snapshot.usage
                    ? `Monthly ${snapshot.usage.monthly.total}`
                    : "No monthly usage window cached yet",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Usage Window",
                    "",
                    snapshot.usage
                      ? "Current request volume and engine distribution from the cached usage window."
                      : "No usage snapshot is cached yet. Refresh after reconnecting if you want current request totals.",
                    "",
                    snapshot.usage
                      ? `- Daily: ${formatUsageWindow(snapshot.usage.daily)}`
                      : "- Daily: Unavailable",
                    snapshot.usage
                      ? `- Monthly: ${formatUsageWindow(snapshot.usage.monthly)}`
                      : "- Monthly: Unavailable",
                    snapshot.usage?.engineBreakdown.length
                      ? `- Active engines: ${snapshot.usage.engineBreakdown
                          .slice(0, 5)
                          .map(
                            (entry) =>
                              `${entry.engineId} (${entry.requestCount})`,
                          )
                          .join(", ")}`
                      : "- Active engines: No cached engine breakdown yet",
                    `- Rate limit: ${formatRateLimit(snapshot.rateLimit)}`,
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Command Center"
                >
                  <Action.Push
                    title="Browse Readings"
                    icon={Icon.Book}
                    target={
                      <ReadingsBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                  <Action.Push
                    title="Browse Workflows"
                    icon={Icon.Network}
                    target={
                      <WorkflowsBrowser
                        initialSnapshot={snapshot}
                        syncOnMount={false}
                      />
                    }
                  />
                </NoesisActionPanel>
              }
            />
            <List.Item
              icon={{
                source: Icon.Circle,
                tintColor: getCacheColor(snapshot.cacheState),
              }}
              title={getCacheStatusTitle(snapshot.cacheState)}
              keywords={[
                "sqlite",
                snapshot.cacheState,
                "cache",
                snapshot.source,
              ]}
              accessories={[
                {
                  tag: {
                    value: snapshot.cacheState.toUpperCase(),
                    color: getCacheColor(snapshot.cacheState),
                  },
                },
                {
                  text: formatRelativeTime(snapshot.timestamps.lastSyncAt),
                  tooltip: snapshot.timestamps.lastSyncAt
                    ? `Last sync ${formatAbsoluteTime(snapshot.timestamps.lastSyncAt)}`
                    : "The cache has not been synchronized yet",
                },
              ]}
              detail={
                <List.Item.Detail
                  markdown={[
                    "# Snapshot Cache",
                    "",
                    snapshot.syncError ??
                      "The local sqlite cache is active and serving command data first.",
                    "",
                    `- State: ${snapshot.cacheState.toUpperCase()}`,
                    `- Source: ${snapshot.source.toUpperCase()}`,
                    `- Last sync: ${formatRelativeTime(snapshot.timestamps.lastSyncAt)} (${formatAbsoluteTime(snapshot.timestamps.lastSyncAt)})`,
                    `- Service snapshot: ${formatRelativeTime(snapshot.timestamps.service)}`,
                    `- Profile snapshot: ${formatRelativeTime(snapshot.timestamps.profile)}`,
                    `- Usage snapshot: ${formatRelativeTime(snapshot.timestamps.usage)}`,
                    `- Catalog snapshot: ${formatRelativeTime(snapshot.timestamps.catalog)}`,
                    `- Readings snapshot: ${formatRelativeTime(snapshot.timestamps.readings)}`,
                  ].join("\n")}
                />
              }
              actions={
                <NoesisActionPanel
                  onRefresh={reload}
                  hideDashboardAction
                  refreshTitle="Refresh Command Center"
                />
              }
            />
          </List.Section>

          {featuredEngines.length ? (
            <List.Section title="Active Engines">
              {featuredEngines.map((engine) => (
                <List.Item
                  key={engine.id}
                  icon={{
                    source: Icon.Stars,
                    tintColor: getPhaseColor(engine.requiredPhase),
                  }}
                  title={{
                    value: engine.name,
                    tooltip: `${engine.name}\n${engine.id}`,
                  }}
                  keywords={[
                    engine.id,
                    engine.name,
                    formatPhaseLabel(engine.requiredPhase),
                  ]}
                  accessories={[
                    {
                      tag: {
                        value: formatPhaseBadge(engine.requiredPhase),
                        color: getPhaseColor(engine.requiredPhase),
                      },
                      tooltip: formatPhaseLabel(engine.requiredPhase),
                    },
                    {
                      text: formatCompactCount(
                        getReadingCount(snapshot, engine.id),
                        "R",
                      ),
                      tooltip: `${getReadingCount(snapshot, engine.id)} cached readings`,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `# ${engine.name}`,
                        "",
                        `\`${engine.id}\``,
                        "",
                        `${formatCount(getReadingCount(snapshot, engine.id), "cached reading")} in the current dashboard snapshot.`,
                        "",
                        "Enter opens the engine execution form, with engine detail still available as a secondary action.",
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                      <Action.Push
                        title="Run Engine"
                        icon={Icon.Play}
                        target={
                          <EngineExecutionForm
                            engine={engine}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="View Engine"
                        icon={Icon.ArrowRightCircle}
                        target={
                          <EngineDetailView
                            engine={engine}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="Browse Engines"
                        icon={Icon.AppWindowList}
                        target={
                          <EnginesBrowser
                            initialSnapshot={snapshot}
                            syncOnMount={false}
                          />
                        }
                      />
                    </NoesisActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}

          {featuredWorkflows.length ? (
            <List.Section title="Featured Workflows">
              {featuredWorkflows.map((workflow) => (
                <List.Item
                  key={workflow.id}
                  icon={Icon.Network}
                  title={{
                    value: workflow.name,
                    tooltip: `${workflow.name}\n${workflow.id}${workflow.description ? `\n\n${workflow.description}` : ""}`,
                  }}
                  keywords={[workflow.id, ...workflow.engineIds]}
                  accessories={[
                    {
                      text: formatCompactCount(workflow.engineCount, "E"),
                      tooltip: `${workflow.engineCount} engines`,
                    },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `# ${workflow.name}`,
                        "",
                        workflow.description || "Composite Selemene workflow.",
                        "",
                        workflow.engineIds.length
                          ? `Engines: ${workflow.engineIds.join(", ")}`
                          : "Engine list will expand in the dedicated workflow browser.",
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                      <Action.Push
                        title="Run Workflow"
                        icon={Icon.Play}
                        target={
                          <WorkflowExecutionForm
                            workflow={workflow}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="View Workflow"
                        icon={Icon.ArrowRightCircle}
                        target={
                          <WorkflowDetailView
                            workflow={workflow}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="Browse Workflows"
                        icon={Icon.AppWindowList}
                        target={
                          <WorkflowsBrowser
                            initialSnapshot={snapshot}
                            syncOnMount={false}
                          />
                        }
                      />
                    </NoesisActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}

          {recentReadings.length ? (
            <List.Section title="Recent Readings">
              {recentReadings.map((reading) => (
                <List.Item
                  key={reading.id}
                  icon={reading.workflowId ? Icon.Network : Icon.Book}
                  title={{
                    value:
                      truncate(reading.witnessPrompt, 72) || reading.engineId,
                    tooltip: [
                      reading.engineId,
                      reading.workflowId,
                      reading.witnessPrompt,
                    ]
                      .filter(Boolean)
                      .join("\n"),
                  }}
                  keywords={[
                    reading.engineId,
                    reading.workflowId ?? "",
                    reading.id,
                  ]}
                  accessories={[
                    { text: formatRelativeTime(reading.createdAt) },
                  ]}
                  detail={
                    <List.Item.Detail
                      markdown={[
                        `# ${truncate(reading.witnessPrompt, 56) || reading.engineId}`,
                        "",
                        `${formatReadingSubtitle(reading.engineId, reading.workflowId)}`,
                        "",
                        truncate(reading.witnessPrompt, 240) ||
                          "_No witness prompt stored._",
                      ].join("\n")}
                    />
                  }
                  actions={
                    <NoesisActionPanel onRefresh={reload} hideDashboardAction>
                      <Action.Push
                        title="Open Reading"
                        icon={Icon.Book}
                        target={
                          <ReadingDetailView
                            reading={reading}
                            snapshot={snapshot}
                          />
                        }
                      />
                      <Action.Push
                        title="Browse Readings"
                        icon={Icon.AppWindowList}
                        target={
                          <ReadingsBrowser
                            initialSnapshot={snapshot}
                            syncOnMount={false}
                          />
                        }
                      />
                    </NoesisActionPanel>
                  }
                />
              ))}
            </List.Section>
          ) : null}
        </>
      ) : null}
    </List>
  );
}

function getFeaturedEngines(snapshot: DashboardSnapshot) {
  const engineScores = new Map<string, number>();

  for (const stat of snapshot.readingStats) {
    engineScores.set(stat.engineId, stat.count);
  }

  for (const entry of snapshot.usage?.engineBreakdown ?? []) {
    engineScores.set(
      entry.engineId,
      (engineScores.get(entry.engineId) ?? 0) + entry.requestCount,
    );
  }

  return [...snapshot.engines]
    .sort(
      (left, right) =>
        (engineScores.get(right.id) ?? 0) - (engineScores.get(left.id) ?? 0),
    )
    .slice(0, 5);
}

function getFeaturedWorkflows(snapshot: DashboardSnapshot) {
  return [...snapshot.workflows]
    .sort((left, right) => right.engineCount - left.engineCount)
    .slice(0, 4);
}

function getReadingCount(snapshot: DashboardSnapshot, engineId: string) {
  return (
    snapshot.readingStats.find((entry) => entry.engineId === engineId)?.count ??
    0
  );
}

function getPulsePendingTitle(
  pulseModeLabel: string,
  snapshot: DashboardSnapshot | null | undefined,
): string {
  if (!snapshot?.hasCredentials) {
    return "Reconnect to Warm Pulse";
  }

  if (pulseModeLabel !== "TCM Organ" && !snapshot.profile?.birthDate) {
    return `${pulseModeLabel} Needs Profile`;
  }

  return pulseModeLabel === "TCM Organ"
    ? "Current TCM Organ"
    : `${pulseModeLabel} Pending`;
}

function getPulsePendingSummary(
  pulseModeLabel: string,
  snapshot: DashboardSnapshot | null | undefined,
): string {
  if (!snapshot?.hasCredentials) {
    return "Reconnect the API key to refresh live pulse data from the Selemene Engine.";
  }

  if (pulseModeLabel !== "TCM Organ" && !snapshot.profile?.birthDate) {
    return `Add birth data and timezone in Profile to unlock ${pulseModeLabel.toLowerCase()} pulse.`;
  }

  return "Refresh the pulse cache to surface the current reading.";
}

function getPulseIcon(kind: MenuBarInsightKind): Icon {
  switch (kind) {
    case "biorhythm":
      return Icon.Heartbeat;
    case "vimshottari":
      return Icon.Stars;
    case "vedicClock":
    default:
      return Icon.Clock;
  }
}

function getPulseColor(kind: MenuBarInsightKind): Color {
  switch (kind) {
    case "biorhythm":
      return Color.Green;
    case "vimshottari":
      return Color.Orange;
    case "vedicClock":
    default:
      return Color.Yellow;
  }
}

function getCacheStatusTitle(
  cacheState: DashboardSnapshot["cacheState"],
): string {
  switch (cacheState) {
    case "fresh":
      return "Snapshot Fresh";
    case "stale":
      return "Snapshot Aging";
    case "cached":
      return "Offline Cache Ready";
    case "empty":
    default:
      return "Cache Empty";
  }
}
