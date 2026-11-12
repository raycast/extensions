import { Icon, MenuBarExtra, open } from "@raycast/api";
import {
  STATUS_PAGE_URL,
  affectedComponents,
  componentStatusIcon,
  componentStatusLabel,
  incidentIcon,
  incidentStatusLabel,
  incidentURL,
  indicatorIcon,
  isMaintenance,
  latestUpdate,
  maintenanceSubtitle,
  maintenanceWindows,
  relativeTime,
} from "../../status/status-page";
import type { StatusSummary } from "../../status/types";

/** Vercel's service status as one menu section: overall status, incidents, maintenance, affected components. */
export default function StatusSection({ summary, error }: { summary?: StatusSummary; error?: Error }) {
  if (!summary) {
    return error ? (
      <MenuBarExtra.Section title="Vercel Status">
        <MenuBarExtra.Item title="Unable to load Vercel status" subtitle={error.message} icon={Icon.WifiDisabled} />
      </MenuBarExtra.Section>
    ) : null;
  }

  const affected = affectedComponents(summary);

  return (
    <MenuBarExtra.Section title="Vercel Status">
      {error && (
        // keepPreviousData keeps the last summary after a failed refresh: say it may be out of date.
        <MenuBarExtra.Item
          title="Couldn't refresh, showing the last known status"
          subtitle={error.message}
          icon={Icon.WifiDisabled}
        />
      )}
      <MenuBarExtra.Item
        title={summary.status.description}
        subtitle={`Updated ${relativeTime(summary.page.updated_at)}`}
        icon={indicatorIcon(summary.status.indicator)}
        onAction={() => open(STATUS_PAGE_URL)}
      />
      {[...summary.incidents, ...maintenanceWindows(summary)].map((incident) => (
        <MenuBarExtra.Item
          key={incident.id}
          title={incident.name}
          subtitle={
            isMaintenance(incident)
              ? maintenanceSubtitle(incident)
              : `${incidentStatusLabel(incident.status)} • ${relativeTime(incident.updated_at)}`
          }
          tooltip={latestUpdate(incident)?.body}
          icon={incidentIcon(incident)}
          onAction={() => open(incidentURL(incident))}
        />
      ))}
      {affected.length > 0 && (
        <MenuBarExtra.Submenu title={`Affected Components (${affected.length})`} icon={Icon.Layers}>
          {affected.map(({ component, displayName }) => (
            <MenuBarExtra.Item
              key={component.id}
              title={displayName}
              subtitle={componentStatusLabel(component.status)}
              icon={componentStatusIcon(component.status)}
              onAction={() => open(STATUS_PAGE_URL)}
            />
          ))}
        </MenuBarExtra.Submenu>
      )}
    </MenuBarExtra.Section>
  );
}
