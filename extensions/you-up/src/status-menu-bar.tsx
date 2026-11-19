import {
  Color,
  Icon,
  Keyboard,
  LaunchType,
  MenuBarExtra,
  launchCommand,
  open,
  openCommandPreferences,
  openExtensionPreferences,
  showHUD,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { acknowledgeIncident, getStatus } from "./api";
import {
  DASHBOARD_ORIGIN,
  checkTypeLabel,
  formatErrorKind,
  formatRelativeTime,
  incidentDashboardUrl,
  monitorDashboardUrl,
} from "./format";

// Menu bar commands run in the background, where the Toast API is not available, so feedback goes through showHUD.
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export default function StatusMenuBarCommand() {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => getStatus(), [], {
    keepPreviousData: true,
  });

  const projects = data?.projects ?? [];
  const openIncidents = projects.flatMap((project) =>
    project.incidents.map((incident) => ({
      project,
      incident,
      monitor: project.monitors.find((m) => m.id === incident.monitorId),
    })),
  );
  const degradedMonitors = projects.flatMap((project) =>
    project.monitors
      .filter((m) => m.status === "failed" || m.status === "warning")
      .map((monitor) => ({ project, monitor })),
  );
  const regionalOutages = projects.flatMap((project) =>
    project.regionalOutages.map((outage) => ({
      project,
      outage,
      monitor: project.monitors.find((m) => m.id === outage.monitorId),
    })),
  );

  const unackedCount = openIncidents.filter((row) => row.incident.acknowledgedAt === null).length;
  const totalIncidents = openIncidents.length;

  const menuBarIcon = error
    ? { source: Icon.ExclamationMark, tintColor: Color.Red }
    : totalIncidents > 0
      ? { source: Icon.XMarkCircle, tintColor: unackedCount > 0 ? Color.Red : Color.Orange }
      : degradedMonitors.length > 0 || regionalOutages.length > 0
        ? { source: Icon.ExclamationMark, tintColor: Color.Yellow }
        : { source: Icon.CheckCircle, tintColor: Color.Green };

  const menuBarTitle = error
    ? "!"
    : totalIncidents > 0
      ? String(totalIncidents)
      : degradedMonitors.length > 0
        ? String(degradedMonitors.length)
        : regionalOutages.length > 0
          ? String(regionalOutages.length)
          : undefined;

  const tooltip = error
    ? `You Up?: ${error.message}`
    : totalIncidents > 0
      ? `You Up?: ${totalIncidents} open ${totalIncidents === 1 ? "Incident" : "Incidents"}`
      : degradedMonitors.length > 0
        ? `You Up?: ${degradedMonitors.length} degraded ${degradedMonitors.length === 1 ? "Monitor" : "Monitors"}`
        : regionalOutages.length > 0
          ? `You Up?: ${regionalOutages.length} Regional ${regionalOutages.length === 1 ? "Outage" : "Outages"}`
          : "You Up?: Everything is up";

  async function handleQuickAcknowledge(projectId: string, incidentId: string) {
    try {
      await acknowledgeIncident(projectId, incidentId);
      await revalidate();
      await showHUD("Incident Acknowledged");
    } catch (err) {
      await showHUD(`Could Not Acknowledge Incident: ${errorMessage(err)}`);
    }
  }

  async function handleOpenCommand(name: "monitors" | "incidents") {
    try {
      await launchCommand({ name, type: LaunchType.UserInitiated });
    } catch (err) {
      await showHUD(`Could Not Open Command: ${errorMessage(err)}`);
    }
  }

  const summaryTitle =
    totalIncidents > 0
      ? `${totalIncidents} Open ${totalIncidents === 1 ? "Incident" : "Incidents"}`
      : degradedMonitors.length > 0
        ? `${degradedMonitors.length} Degraded ${degradedMonitors.length === 1 ? "Monitor" : "Monitors"}`
        : regionalOutages.length > 0
          ? `${regionalOutages.length} Regional ${regionalOutages.length === 1 ? "Outage" : "Outages"}`
          : `All ${projects.length} ${projects.length === 1 ? "Project" : "Projects"} Operational`;

  return (
    <MenuBarExtra isLoading={isLoading} icon={menuBarIcon} title={menuBarTitle} tooltip={tooltip}>
      {error ? (
        <MenuBarExtra.Section title="Connection Error">
          <MenuBarExtra.Item title={error.message} icon={Icon.ExclamationMark} onAction={openExtensionPreferences} />
        </MenuBarExtra.Section>
      ) : (
        <>
          <MenuBarExtra.Section title="Summary">
            <MenuBarExtra.Item title={summaryTitle} icon={menuBarIcon} />
          </MenuBarExtra.Section>

          {openIncidents.length > 0 && (
            <MenuBarExtra.Section title="Open Incidents">
              {openIncidents.slice(0, 10).map(({ project, incident, monitor }) => {
                const label = `${monitor?.name ?? incident.monitorId} — ${formatErrorKind(incident.errorKind)}`;
                const sub = `${checkTypeLabel(incident.checkType)} · ${formatRelativeTime(incident.openedAt)}${
                  incident.acknowledgedAt ? " (Acked)" : ""
                }`;
                return (
                  <MenuBarExtra.Submenu
                    key={incident.id}
                    title={label}
                    icon={
                      incident.acknowledgedAt
                        ? { source: Icon.ExclamationMark, tintColor: Color.Orange }
                        : { source: Icon.XMarkCircle, tintColor: Color.Red }
                    }
                  >
                    <MenuBarExtra.Item title={sub} />
                    <MenuBarExtra.Item
                      title="Open in Dashboard"
                      icon={Icon.Globe}
                      onAction={() => open(incidentDashboardUrl(project.projectId, incident.monitorId, incident.id))}
                    />
                    {!incident.acknowledgedAt && (
                      <MenuBarExtra.Item
                        title="Acknowledge Incident"
                        icon={Icon.Check}
                        onAction={() => handleQuickAcknowledge(project.projectId, incident.id)}
                      />
                    )}
                  </MenuBarExtra.Submenu>
                );
              })}
            </MenuBarExtra.Section>
          )}

          {degradedMonitors.length > 0 && (
            <MenuBarExtra.Section title="Monitors Needing Attention">
              {degradedMonitors.slice(0, 10).map(({ project, monitor }) => (
                <MenuBarExtra.Item
                  key={monitor.id}
                  title={monitor.name}
                  subtitle={`${project.name} · ${monitor.status ?? "unknown"}`}
                  icon={
                    monitor.status === "failed"
                      ? { source: Icon.XMarkCircle, tintColor: Color.Red }
                      : { source: Icon.ExclamationMark, tintColor: Color.Yellow }
                  }
                  onAction={() => open(monitorDashboardUrl(project.projectId, monitor.id))}
                />
              ))}
            </MenuBarExtra.Section>
          )}

          {regionalOutages.length > 0 && (
            <MenuBarExtra.Section title="Regional Outages">
              {regionalOutages.slice(0, 5).map(({ project, outage, monitor }) => (
                <MenuBarExtra.Item
                  key={outage.id}
                  title={`${monitor?.name ?? outage.monitorId} (${outage.location.toUpperCase()})`}
                  subtitle={formatRelativeTime(outage.openedAt)}
                  icon={{ source: Icon.Globe, tintColor: Color.Yellow }}
                  onAction={() => open(monitorDashboardUrl(project.projectId, outage.monitorId))}
                />
              ))}
            </MenuBarExtra.Section>
          )}
        </>
      )}

      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Monitors"
          icon={Icon.List}
          shortcut={{ modifiers: ["cmd"], key: "m" }}
          onAction={() => handleOpenCommand("monitors")}
        />
        <MenuBarExtra.Item
          title="Open Incidents"
          icon={Icon.Bell}
          shortcut={{ modifiers: ["cmd"], key: "i" }}
          onAction={() => handleOpenCommand("incidents")}
        />
        <MenuBarExtra.Item
          title="Open You Up? Dashboard"
          icon={Icon.Globe}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={() => open(DASHBOARD_ORIGIN)}
        />
        <MenuBarExtra.Item
          title="Refresh Now"
          icon={Icon.RotateClockwise}
          shortcut={Keyboard.Shortcut.Common.Refresh}
          onAction={() => revalidate()}
        />
        <MenuBarExtra.Item title="Configure Menu Bar..." icon={Icon.Gear} onAction={openCommandPreferences} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
