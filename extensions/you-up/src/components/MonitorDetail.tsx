import { Action, ActionPanel, Color, Detail, Icon, Toast, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { acknowledgeIncident, endSnooze, getMonitorUptime, listRuns, snoozeCheck } from "../api";
import {
  SNOOZE_PRESETS,
  activeSnoozedChecks,
  checkTypeLabel,
  formatErrorKind,
  formatRelativeTime,
  formatUptimePercent,
  monitorDashboardUrl,
  monitorStatusLabel,
  monitorTypeLabel,
  openIncidentsOnMonitor,
  primaryCheckOf,
  untilMinutesFromNow,
} from "../format";
import type { Monitor } from "../types";

interface MonitorDetailProps {
  monitor: Monitor;
  projectName: string;
  onRefresh: () => void;
}

export function MonitorDetail({ monitor, projectName, onRefresh }: MonitorDetailProps) {
  const { data: uptime, isLoading: loadingUptime } = useCachedPromise(
    (projectId: string, monitorId: string) => getMonitorUptime(projectId, monitorId),
    [monitor.projectId, monitor.id],
  );

  const { data: runs, isLoading: loadingRuns } = useCachedPromise(
    (projectId: string, monitorId: string) => listRuns(projectId, monitorId, 8),
    [monitor.projectId, monitor.id],
  );

  const statusBadge = monitorStatusLabel(monitor);
  const openIncidents = openIncidentsOnMonitor(monitor);
  const unackedIncidents = openIncidents.filter((inc) => !inc.acknowledged);
  const snoozed = activeSnoozedChecks(monitor);
  const primaryCheck = primaryCheckOf(monitor);

  const lines: string[] = [`# ${monitor.name}`, ""];
  if (monitor.description) {
    lines.push(monitor.description, "");
  }
  lines.push(`**Target:** \`${monitor.target}\`  `, `**Project:** ${projectName}`, "");

  lines.push("## Checks", "");
  for (const check of monitor.checks) {
    if (!check.enabled) continue;
    const parts = [`- **${checkTypeLabel(check.type)}**: ${check.status.toUpperCase()} (every ${check.intervalSec}s)`];
    if (check.openIncident) {
      parts.push(
        `— Open Incident (${formatErrorKind(check.openIncident.errorKind)}, opened ${formatRelativeTime(check.openIncident.openedAt)}${
          check.openIncident.acknowledgedAt ? ", Acknowledged" : ""
        })`,
      );
    }
    if (check.snoozedUntil && new Date(check.snoozedUntil).getTime() > Date.now()) {
      parts.push(`— Snoozed ${formatRelativeTime(check.snoozedUntil)}`);
    }
    if (check.heartbeatDeadline) {
      parts.push(`— Next due ${formatRelativeTime(check.heartbeatDeadline)}`);
    }
    lines.push(parts.join(" "));
  }

  if (runs && runs.length > 0) {
    lines.push("", "## Recent Runs", "");
    lines.push("| Time | Location | Outcome | Detail | Latency |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const run of runs) {
      const detail =
        run.outcome === "ok"
          ? run.statusCode
            ? `HTTP ${run.statusCode}`
            : "OK"
          : formatErrorKind(run.errorKind) + (run.statusCode ? ` (HTTP ${run.statusCode})` : "");
      const latency = run.totalMs !== null ? `${Math.round(run.totalMs)} ms` : "—";
      lines.push(
        `| ${formatRelativeTime(run.startedAt)} | ${run.location ?? "Control plane"} | ${run.outcome} | ${detail} | ${latency} |`,
      );
    }
  }

  async function handleAcknowledge(incidentId: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Acknowledging Incident..." });
    try {
      await acknowledgeIncident(monitor.projectId, incidentId);
      toast.style = Toast.Style.Success;
      toast.title = "Incident Acknowledged";
      onRefresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Acknowledge Incident" });
    }
  }

  async function handleSnooze(checkId: string, minutes: number, label: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Snoozing for ${label}...` });
    try {
      await snoozeCheck(monitor.projectId, checkId, untilMinutesFromNow(minutes));
      toast.style = Toast.Style.Success;
      toast.title = `Snoozed for ${label}`;
      onRefresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Snooze Check" });
    }
  }

  async function handleEndSnooze(checkId: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Ending Snooze..." });
    try {
      await endSnooze(monitor.projectId, checkId);
      toast.style = Toast.Style.Success;
      toast.title = "Snooze Ended";
      onRefresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not End Snooze" });
    }
  }

  return (
    <Detail
      isLoading={loadingUptime || loadingRuns}
      markdown={lines.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={statusBadge.text} color={statusBadge.color} />
            <Detail.Metadata.TagList.Item text={monitorTypeLabel(monitor.type)} color={Color.Blue} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Project" text={projectName} />
          <Detail.Metadata.Label title="Target" text={monitor.target} />
          {monitor.locations.length > 0 && (
            <Detail.Metadata.Label title="Locations" text={monitor.locations.join(", ").toUpperCase()} />
          )}
          <Detail.Metadata.Separator />
          {uptime?.windows.map((win) => (
            <Detail.Metadata.Label
              key={win.window}
              title={`Uptime (${win.window})`}
              text={formatUptimePercent(win.percentage)}
            />
          ))}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Dashboard"
            target={monitorDashboardUrl(monitor.projectId, monitor.id)}
            text="Open Monitor"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Dashboard" url={monitorDashboardUrl(monitor.projectId, monitor.id)} />
          <Action.CopyToClipboard title="Copy Target" content={monitor.target} />
          {unackedIncidents.length === 1 ? (
            <Action
              title={`Acknowledge ${checkTypeLabel(unackedIncidents[0].check.type)} Incident`}
              icon={Icon.Check}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={() => handleAcknowledge(unackedIncidents[0].incidentId)}
            />
          ) : unackedIncidents.length > 1 ? (
            <ActionPanel.Submenu
              title="Acknowledge Incident"
              icon={Icon.Check}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            >
              {unackedIncidents.map((inc) => (
                <Action
                  key={inc.incidentId}
                  title={checkTypeLabel(inc.check.type)}
                  icon={Icon.Check}
                  onAction={() => handleAcknowledge(inc.incidentId)}
                />
              ))}
            </ActionPanel.Submenu>
          ) : null}
          {primaryCheck && (
            <ActionPanel.Submenu
              title="Snooze Alerts"
              icon={Icon.BellDisabled}
              shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            >
              {SNOOZE_PRESETS.map((preset) => (
                <Action
                  key={preset.minutes}
                  title={preset.label}
                  icon={Icon.Clock}
                  onAction={() => handleSnooze(primaryCheck.id, preset.minutes, preset.label)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          {snoozed.map((check) => (
            <Action
              key={check.id}
              title={`End Snooze (${checkTypeLabel(check.type)})`}
              icon={Icon.Bell}
              onAction={() => handleEndSnooze(check.id)}
            />
          ))}
          <Action.CopyToClipboard title="Copy Monitor ID" content={monitor.id} />
        </ActionPanel>
      }
    />
  );
}
