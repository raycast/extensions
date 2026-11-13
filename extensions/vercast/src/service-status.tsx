import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useIncidentHistory, useStatusSummary } from "./hooks/use-vercel-status";
import IncidentDetail from "./pages/details/incident-detail";
import {
  STATUS_PAGE_URL,
  affectedComponents,
  componentSections,
  componentStatusColor,
  componentStatusIcon,
  componentStatusLabel,
  impactColor,
  impactLabel,
  incidentIcon,
  incidentStatusLabel,
  incidentURL,
  indicatorIcon,
  maintenanceSubtitle,
  maintenanceWindows,
  recentlyResolved,
  relativeTime,
} from "./status/status-page";
import type { Incident } from "./status/types";

const PAST_INCIDENT_DAYS = 7;

export default function ServiceStatus() {
  const summary = useStatusSummary();
  const history = useIncidentHistory();

  const refresh = () => {
    summary.revalidate();
    history.revalidate();
  };

  const data = summary.data;
  const pastIncidents = recentlyResolved(history.data?.incidents ?? [], PAST_INCIDENT_DAYS, new Date());
  const affected = data ? affectedComponents(data) : [];

  const commonActions = (
    <>
      <Action.OpenInBrowser title="Open Status Page" url={STATUS_PAGE_URL} icon={Icon.Globe} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </>
  );

  const incidentItem = (incident: Incident, subtitle?: string) => (
    <List.Item
      key={incident.id}
      title={incident.name}
      subtitle={subtitle}
      icon={incidentIcon(incident)}
      keywords={incident.components.map((component) => component.name)}
      accessories={[
        { tag: { value: impactLabel(incident.impact), color: impactColor(incident.impact) } },
        { text: relativeTime(incident.updated_at), tooltip: "Last update" },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Binoculars} target={<IncidentDetail incident={incident} />} />
          <Action.OpenInBrowser title="Open Incident" url={incidentURL(incident)} />
          <Action.CopyToClipboard
            title="Copy Incident URL"
            content={incidentURL(incident)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          {commonActions}
        </ActionPanel>
      }
    />
  );

  return (
    <List isLoading={summary.isLoading || history.isLoading} searchBarPlaceholder="Search incidents and components...">
      {/* A row, not an EmptyView: the resolved incidents load separately and would hide an empty view. */}
      {!data && summary.error && (
        <List.Section title="Current Status">
          <List.Item
            title="Unable to Load Vercel Status"
            subtitle={summary.error.message}
            icon={Icon.WifiDisabled}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        </List.Section>
      )}
      {data && (
        <List.Section title="Current Status">
          <List.Item
            title={data.status.description}
            icon={indicatorIcon(data.status.indicator)}
            accessories={[{ text: `Updated ${relativeTime(data.page.updated_at)}` }]}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        </List.Section>
      )}

      <List.Section title="Active Incidents">
        {data?.incidents.map((incident) => incidentItem(incident, incidentStatusLabel(incident.status)))}
      </List.Section>

      <List.Section title="Scheduled Maintenance">
        {data &&
          maintenanceWindows(data).map((maintenance) => incidentItem(maintenance, maintenanceSubtitle(maintenance)))}
      </List.Section>

      <List.Section title="Affected Components">
        {affected.map(({ component, displayName }) => (
          <List.Item
            key={component.id}
            title={displayName}
            icon={componentStatusIcon(component.status)}
            accessories={[
              { tag: { value: componentStatusLabel(component.status), color: componentStatusColor(component.status) } },
            ]}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        ))}
      </List.Section>

      <List.Section title={`Resolved in the Last ${PAST_INCIDENT_DAYS} Days`}>
        {/* The section title says "resolved" and the accessory says when: no subtitle, so the name fits. */}
        {!history.data && history.error ? (
          // Without this row a failed history request reads as "nothing was resolved".
          <List.Item
            title="Unable to Load Past Incidents"
            subtitle={history.error.message}
            icon={Icon.WifiDisabled}
            actions={<ActionPanel>{commonActions}</ActionPanel>}
          />
        ) : (
          pastIncidents.map((incident) => incidentItem(incident))
        )}
      </List.Section>

      {data &&
        componentSections(data).map((section) => (
          <List.Section key={section.id} title={section.title}>
            {section.components.map((component) => (
              <List.Item
                key={component.id}
                title={component.name}
                subtitle={component.description ?? undefined}
                icon={componentStatusIcon(component.status)}
                keywords={[section.title]}
                accessories={[{ text: componentStatusLabel(component.status) }]}
                actions={<ActionPanel>{commonActions}</ActionPanel>}
              />
            ))}
          </List.Section>
        ))}
    </List>
  );
}
