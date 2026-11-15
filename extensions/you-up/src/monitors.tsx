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
import {
  acknowledgeIncident,
  endSnooze,
  getProjectUptime,
  listMonitors,
  listProjects,
  pauseMonitor,
  resumeMonitor,
  snoozeCheck,
} from "./api";
import { MonitorDetail } from "./components/MonitorDetail";
import {
  DASHBOARD_ORIGIN,
  SNOOZE_PRESETS,
  activeSnoozedChecks,
  checkTypeLabel,
  formatRelativeTime,
  formatUptimePercent,
  monitorDashboardUrl,
  monitorStatusIcon,
  monitorTypeLabel,
  openIncidentsOnMonitor,
  primaryCheckOf,
  untilMinutesFromNow,
} from "./format";
import type { Monitor, Project } from "./types";

interface MonitorEntry {
  project: Project;
  monitor: Monitor;
  uptime30d: number | null | undefined;
}

async function fetchMonitorEntries(
  selectedProjectId: string,
): Promise<{ projects: Project[]; entries: MonitorEntry[] }> {
  const projects = await listProjects();
  const targetProjects =
    selectedProjectId === "all" ? projects : projects.filter((project) => project.id === selectedProjectId);

  const perProject = await Promise.all(
    targetProjects.map(async (project) => {
      const [monitors, uptimes] = await Promise.all([listMonitors(project.id), getProjectUptime(project.id)]);
      const uptimeMap = new Map(uptimes.map((item) => [item.monitorId, item.window.percentage]));
      return monitors.map((monitor) => ({
        project,
        monitor,
        uptime30d: uptimeMap.get(monitor.id),
      }));
    }),
  );

  return { projects, entries: perProject.flat() };
}

export default function MonitorsCommand() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const { data, isLoading, error, revalidate } = useCachedPromise(
    (projectId: string) => fetchMonitorEntries(projectId),
    [selectedProjectId],
  );

  const projects = data?.projects ?? [];
  const entries = data?.entries ?? [];

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
    const toast = await showToast({ style: Toast.Style.Animated, title: `Snoozing for ${label}...` });
    try {
      await snoozeCheck(projectId, checkId, untilMinutesFromNow(minutes));
      toast.style = Toast.Style.Success;
      toast.title = `Snoozed for ${label}`;
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Could Not Snooze Check" });
    }
  }

  async function handleEndSnooze(projectId: string, checkId: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Ending Snooze..." });
    try {
      await endSnooze(projectId, checkId);
      toast.style = Toast.Style.Success;
      toast.title = "Snooze Ended";
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Could Not End Snooze" });
    }
  }

  async function handlePauseResume(monitor: Monitor) {
    if (monitor.state === "paused") {
      const toast = await showToast({ style: Toast.Style.Animated, title: "Resuming Monitor..." });
      try {
        await resumeMonitor(monitor.projectId, monitor.id);
        toast.style = Toast.Style.Success;
        toast.title = "Monitor Resumed";
        await revalidate();
      } catch (err) {
        await showFailureToast(err, { title: "Could Not Resume Monitor" });
      }
      return;
    }

    const confirmed = await confirmAlert({
      title: `Pause "${monitor.name}"?`,
      message: "Checks stop running while paused, and any open Incidents on this Monitor will close.",
      primaryAction: { title: "Pause Monitor", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;

    const toast = await showToast({ style: Toast.Style.Animated, title: "Pausing Monitor..." });
    try {
      await pauseMonitor(monitor.projectId, monitor.id);
      toast.style = Toast.Style.Success;
      toast.title = "Monitor Paused";
      await revalidate();
    } catch (err) {
      await showFailureToast(err, { title: "Could Not Pause Monitor" });
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter Monitors by name, target, or type..."
      searchBarAccessory={
        projects.length > 1 ? (
          <List.Dropdown tooltip="Select Project" value={selectedProjectId} onChange={setSelectedProjectId}>
            <List.Dropdown.Item title="All Projects" value="all" />
            <List.Dropdown.Section title="Projects">
              {projects.map((project) => (
                <List.Dropdown.Item key={project.id} title={project.name} value={project.id} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {error ? (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Could Not Load Monitors"
          description={error.message}
          actions={
            <ActionPanel>
              <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : entries.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Monitors Yet"
          description="Create your first Monitor in the You Up? dashboard."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Open Dashboard" url={DASHBOARD_ORIGIN} />
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : (
        projects
          .filter((project) => selectedProjectId === "all" || project.id === selectedProjectId)
          .map((project) => {
            const projectEntries = entries.filter((entry) => entry.project.id === project.id);
            if (projectEntries.length === 0) return null;
            return (
              <List.Section
                key={project.id}
                title={project.name}
                subtitle={`${projectEntries.length} ${projectEntries.length === 1 ? "Monitor" : "Monitors"}`}
              >
                {projectEntries.map(({ monitor, uptime30d }) => {
                  const openIncidents = openIncidentsOnMonitor(monitor);
                  const unackedIncidents = openIncidents.filter((inc) => !inc.acknowledged);
                  const snoozed = activeSnoozedChecks(monitor);
                  const primaryCheck = primaryCheckOf(monitor);
                  const accessories: List.Item.Accessory[] = [];

                  for (const inc of openIncidents) {
                    accessories.push({
                      tag: {
                        value: inc.acknowledged ? "Acknowledged" : "Incident Open",
                        color: inc.acknowledged ? Color.Orange : Color.Red,
                      },
                    });
                  }

                  if (snoozed.length > 0 && snoozed[0].snoozedUntil) {
                    accessories.push({
                      icon: Icon.BellDisabled,
                      tooltip: `Snoozed ${formatRelativeTime(snoozed[0].snoozedUntil)}`,
                    });
                  }

                  accessories.push({
                    text: formatUptimePercent(uptime30d),
                    tooltip: "30-day uptime",
                  });
                  accessories.push({
                    tag: monitorTypeLabel(monitor.type),
                  });

                  return (
                    <List.Item
                      key={monitor.id}
                      icon={monitorStatusIcon(monitor)}
                      title={monitor.name}
                      subtitle={monitor.target}
                      keywords={[monitor.target, monitor.type, project.name]}
                      accessories={accessories}
                      actions={
                        <ActionPanel>
                          <Action.Push
                            title="View Monitor Details"
                            icon={Icon.Eye}
                            target={
                              <MonitorDetail
                                monitor={monitor}
                                projectName={project.name}
                                onRefresh={() => revalidate()}
                              />
                            }
                          />
                          <Action.OpenInBrowser
                            title="Open in Dashboard"
                            url={monitorDashboardUrl(project.id, monitor.id)}
                          />
                          {unackedIncidents.length === 1 ? (
                            <Action
                              title={`Acknowledge ${checkTypeLabel(unackedIncidents[0].check.type)} Incident`}
                              icon={Icon.Check}
                              shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                              onAction={() => handleAcknowledge(project.id, unackedIncidents[0].incidentId)}
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
                                  onAction={() => handleAcknowledge(project.id, inc.incidentId)}
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
                                  onAction={() =>
                                    handleSnooze(project.id, primaryCheck.id, preset.minutes, preset.label)
                                  }
                                />
                              ))}
                            </ActionPanel.Submenu>
                          )}
                          {snoozed.map((check) => (
                            <Action
                              key={check.id}
                              title={`End Snooze (${checkTypeLabel(check.type)})`}
                              icon={Icon.Bell}
                              onAction={() => handleEndSnooze(project.id, check.id)}
                            />
                          ))}
                          {monitor.state !== "suspended" && (
                            <Action
                              title={monitor.state === "paused" ? "Resume Monitor" : "Pause Monitor"}
                              icon={monitor.state === "paused" ? Icon.Play : Icon.Pause}
                              style={monitor.state === "paused" ? Action.Style.Regular : Action.Style.Destructive}
                              shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                              onAction={() => handlePauseResume(monitor)}
                            />
                          )}
                          <Action
                            title="Refresh"
                            icon={Icon.RotateClockwise}
                            shortcut={Keyboard.Shortcut.Common.Refresh}
                            onAction={() => revalidate()}
                          />
                          <Action.CopyToClipboard title="Copy Target" content={monitor.target} />
                          <Action.CopyToClipboard title="Copy Monitor ID" content={monitor.id} />
                        </ActionPanel>
                      }
                    />
                  );
                })}
              </List.Section>
            );
          })
      )}
    </List>
  );
}
