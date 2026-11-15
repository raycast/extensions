import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  List,
  Toast,
  confirmAlert,
  openExtensionPreferences,
  showToast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { acknowledgeIncident, listIncidents, listMonitors, listProjects, resolveIncident, snoozeCheck } from "./api";
import { IncidentDetail } from "./components/IncidentDetail";
import {
  DASHBOARD_ORIGIN,
  SNOOZE_PRESETS,
  checkTypeLabel,
  formatDurationBetween,
  formatErrorKind,
  formatRelativeTime,
  incidentDashboardUrl,
  untilMinutesFromNow,
} from "./format";
import type { Incident, Monitor, Project } from "./types";

type StateFilter = "open" | "resolved" | "all";

interface IncidentRow {
  project: Project;
  incident: Incident;
  monitor: Monitor | undefined;
}

async function fetchIncidentRows(filter: StateFilter): Promise<IncidentRow[]> {
  const projects = await listProjects();
  const openParam = filter === "open" ? "true" : filter === "resolved" ? "false" : undefined;

  const perProject = await Promise.all(
    projects.map(async (project) => {
      const [incidents, monitors] = await Promise.all([
        listIncidents(project.id, { open: openParam, limit: 50 }),
        listMonitors(project.id),
      ]);
      const monitorById = new Map(monitors.map((m) => [m.id, m]));
      return incidents.map((incident) => ({
        project,
        incident,
        monitor: monitorById.get(incident.monitorId),
      }));
    }),
  );

  return perProject
    .flat()
    .sort((a, b) => new Date(b.incident.openedAt).getTime() - new Date(a.incident.openedAt).getTime());
}

export default function IncidentsCommand() {
  const [filter, setFilter] = useState<StateFilter>("open");

  const {
    data: rows = [],
    isLoading,
    error,
    revalidate,
  } = useCachedPromise((stateFilter: StateFilter) => fetchIncidentRows(stateFilter), [filter]);

  async function handleAcknowledge(projectId: string, incidentId: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Acknowledging Incident..." });
    try {
      await acknowledgeIncident(projectId, incidentId);
      toast.style = Toast.Style.Success;
      toast.title = "Incident Acknowledged";
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Could Not Acknowledge Incident" });
    }
  }

  async function handleSnooze(projectId: string, checkId: string, minutes: number, label: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: `Snoozing Check for ${label}...` });
    try {
      await snoozeCheck(projectId, checkId, untilMinutesFromNow(minutes));
      toast.style = Toast.Style.Success;
      toast.title = `Snoozed Check for ${label}`;
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Could Not Snooze Check" });
    }
  }

  async function handleResolve(projectId: string, incidentId: string, monitorName: string) {
    const confirmed = await confirmAlert({
      title: `Resolve Incident on "${monitorName}"?`,
      message: "If the target is still failing on the next check, a new Incident will open.",
      primaryAction: { title: "Resolve", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Resolving Incident..." });
    try {
      await resolveIncident(projectId, incidentId);
      toast.style = Toast.Style.Success;
      toast.title = "Incident Resolved";
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Could Not Resolve Incident" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Incidents by Monitor, reason, or Project..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Incidents" value={filter} onChange={(val) => setFilter(val as StateFilter)}>
          <List.Dropdown.Item title="Open Incidents" value="open" />
          <List.Dropdown.Item title="Resolved Incidents" value="resolved" />
          <List.Dropdown.Item title="All Recent Incidents" value="all" />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could Not Load Incidents"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : rows.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title={filter === "open" ? "Everything Is Up" : "No Incidents Found"}
          description={
            filter === "open"
              ? "There are no open Incidents across your Projects right now."
              : "No Incidents match the selected filter."
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Dashboard" url={DASHBOARD_ORIGIN} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : (
        rows.map(({ project, incident, monitor }) => {
          const isOpen = incident.resolvedAt === null;
          const isAcked = incident.acknowledgedAt !== null;
          const monitorName = monitor?.name ?? incident.monitorId;
          const monitorTarget = monitor?.target ?? "Unknown target";

          const icon = !isOpen
            ? { source: Icon.CheckCircle, tintColor: Color.Green }
            : isAcked
              ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
              : { source: Icon.XMarkCircle, tintColor: Color.Red };

          const accessories: List.Item.Accessory[] = [
            {
              tag: {
                value: !isOpen ? "Resolved" : isAcked ? "Acknowledged" : "Open",
                color: !isOpen ? Color.Green : isAcked ? Color.Orange : Color.Red,
              },
            },
            {
              tag: checkTypeLabel(incident.checkType),
            },
            {
              text: isOpen
                ? `${formatDurationBetween(incident.openedAt, null)} (${formatRelativeTime(incident.openedAt)})`
                : formatDurationBetween(incident.openedAt, incident.resolvedAt),
              tooltip: `Opened ${new Date(incident.openedAt).toLocaleString()}`,
            },
          ];

          return (
            <List.Item
              key={incident.id}
              icon={icon}
              title={monitorName}
              subtitle={`${formatErrorKind(incident.errorKind)} · ${project.name}`}
              keywords={[monitorTarget, project.name, incident.errorKind ?? "", incident.checkType]}
              accessories={accessories}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Outage Evidence"
                    icon={Icon.Eye}
                    target={
                      <IncidentDetail
                        incident={incident}
                        projectId={project.id}
                        projectName={project.name}
                        monitorName={monitorName}
                        monitorTarget={monitorTarget}
                        onRefresh={() => revalidate()}
                      />
                    }
                  />
                  <Action.OpenInBrowser
                    title="Open in Dashboard"
                    url={incidentDashboardUrl(project.id, incident.monitorId, incident.id)}
                  />
                  {isOpen && !isAcked && (
                    <Action
                      title="Acknowledge Incident"
                      icon={Icon.Check}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                      onAction={() => handleAcknowledge(project.id, incident.id)}
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
                          onAction={() => handleSnooze(project.id, incident.checkId, preset.minutes, preset.label)}
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
                      onAction={() => handleResolve(project.id, incident.id, monitorName)}
                    />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={Keyboard.Shortcut.Common.Refresh}
                    onAction={() => revalidate()}
                  />
                  <Action.CopyToClipboard title="Copy Incident ID" content={incident.id} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
