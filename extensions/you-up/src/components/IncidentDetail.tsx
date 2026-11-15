import { Action, ActionPanel, Alert, Color, Detail, Icon, Toast, confirmAlert, showToast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { acknowledgeIncident, getIncidentEvidence, resolveIncident, snoozeCheck } from "../api";
import {
  SNOOZE_PRESETS,
  checkTypeLabel,
  formatDurationBetween,
  formatErrorKind,
  formatRelativeTime,
  incidentDashboardUrl,
  untilMinutesFromNow,
} from "../format";
import type { Incident } from "../types";

interface IncidentDetailProps {
  incident: Incident;
  projectId: string;
  projectName: string;
  monitorName: string;
  monitorTarget: string;
  onRefresh: () => void;
}

export function IncidentDetail({
  incident,
  projectId,
  projectName,
  monitorName,
  monitorTarget,
  onRefresh,
}: IncidentDetailProps) {
  const { data: evidence, isLoading } = useCachedPromise(
    (pid: string, iid: string) => getIncidentEvidence(pid, iid),
    [projectId, incident.id],
  );

  const isOpen = incident.resolvedAt === null;
  const isAcked = incident.acknowledgedAt !== null;

  const lines: string[] = [
    `# ${monitorName} — ${formatErrorKind(incident.errorKind)}`,
    "",
    `**Target:** \`${monitorTarget}\`  `,
    `**Check:** ${checkTypeLabel(incident.checkType)}  `,
    `**Opened:** ${formatRelativeTime(incident.openedAt)} (${new Date(incident.openedAt).toLocaleString()})`,
  ];

  if (incident.acknowledgedAt) {
    lines.push(
      `**Acknowledged:** ${formatRelativeTime(incident.acknowledgedAt)}${
        incident.acknowledgedBy ? ` by ${incident.acknowledgedBy}` : ""
      }`,
    );
  }
  if (incident.resolvedAt) {
    lines.push(`**Resolved:** ${formatRelativeTime(incident.resolvedAt)} (${incident.resolution ?? "ended"})`);
  }

  if (evidence?.stoppingPoint) {
    lines.push(
      "",
      "## Where It Stopped",
      "",
      evidence.stoppingPoint.sentence,
      "",
      `> ${evidence.stoppingPoint.detail}`,
      "",
      `**Next step:** ${evidence.stoppingPoint.nextStep}`,
    );
  }

  if (evidence && evidence.locations.length > 0) {
    lines.push("", "## Locations", "");
    lines.push("| Location | Result | Latency | Checked |");
    lines.push("| --- | --- | --- | --- |");
    for (const loc of evidence.locations) {
      const result = loc.errorKind
        ? formatErrorKind(loc.errorKind) + (loc.statusCode ? ` (HTTP ${loc.statusCode})` : "")
        : loc.statusCode
          ? `HTTP ${loc.statusCode}`
          : "OK";
      const latency = loc.totalMs !== null ? `${Math.round(loc.totalMs)} ms` : "—";
      lines.push(`| ${loc.location.toUpperCase()} | ${result} | ${latency} | ${formatRelativeTime(loc.startedAt)} |`);
    }
  } else if (evidence && !evidence.kept) {
    lines.push("", `_Detailed probe runs are kept for ${evidence.keptDays} days and have aged out._`);
  }

  async function handleAcknowledge() {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Acknowledging Incident..." });
    try {
      await acknowledgeIncident(projectId, incident.id);
      toast.style = Toast.Style.Success;
      toast.title = "Incident Acknowledged";
      onRefresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Acknowledge Incident" });
    }
  }

  async function handleSnooze(minutes: number, label: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Snoozing Check for ${label}...` });
    try {
      await snoozeCheck(projectId, incident.checkId, untilMinutesFromNow(minutes));
      toast.style = Toast.Style.Success;
      toast.title = `Snoozed Check for ${label}`;
      onRefresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Snooze Check" });
    }
  }

  async function handleResolve() {
    const confirmed = await confirmAlert({
      title: "Resolve Incident?",
      message: "If the target is still failing on the next check, a new Incident will open.",
      primaryAction: { title: "Resolve", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Resolving Incident..." });
    try {
      await resolveIncident(projectId, incident.id);
      toast.style = Toast.Style.Success;
      toast.title = "Incident Resolved";
      onRefresh();
    } catch (error) {
      await showFailureToast(error, { title: "Could Not Resolve Incident" });
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={lines.join("\n")}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="State">
            {isOpen ? (
              <Detail.Metadata.TagList.Item
                text={isAcked ? "Acknowledged" : "Open"}
                color={isAcked ? Color.Orange : Color.Red}
              />
            ) : (
              <Detail.Metadata.TagList.Item text="Resolved" color={Color.Green} />
            )}
            <Detail.Metadata.TagList.Item text={checkTypeLabel(incident.checkType)} color={Color.Blue} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Project" text={projectName} />
          <Detail.Metadata.Label title="Monitor" text={monitorName} />
          <Detail.Metadata.Label
            title="Duration"
            text={formatDurationBetween(incident.openedAt, incident.resolvedAt)}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Dashboard"
            target={incidentDashboardUrl(projectId, incident.monitorId, incident.id)}
            text="Open Incident"
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Dashboard"
            url={incidentDashboardUrl(projectId, incident.monitorId, incident.id)}
          />
          <Action.CopyToClipboard title="Copy Incident ID" content={incident.id} />
          {isOpen && !isAcked && (
            <Action
              title="Acknowledge Incident"
              icon={Icon.Check}
              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
              onAction={handleAcknowledge}
            />
          )}
          {isOpen && (
            <ActionPanel.Submenu
              title="Snooze Check"
              icon={Icon.BellDisabled}
              shortcut={{ modifiers: ["cmd", "opt"], key: "s" }}
            >
              {SNOOZE_PRESETS.map((preset) => (
                <Action
                  key={preset.minutes}
                  title={preset.label}
                  icon={Icon.Clock}
                  onAction={() => handleSnooze(preset.minutes, preset.label)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          {isOpen && (
            <Action
              title="Resolve Incident"
              icon={Icon.CheckCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
              onAction={handleResolve}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
