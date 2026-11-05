import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import {
  STATUS_PAGE_URL,
  formatStatusDate,
  impactColor,
  impactLabel,
  incidentStartedAt,
  incidentStatusLabel,
  incidentURL,
  isMaintenance,
} from "../../status/status-page";
import type { Incident } from "../../status/types";

function incidentMarkdown(incident: Incident): string {
  const updates = incident.incident_updates.map(
    (update) => `**${incidentStatusLabel(update.status)}** · ${formatStatusDate(update.display_at)}\n\n${update.body}`,
  );
  return [`# ${incident.name}`, ...updates].join("\n\n---\n\n");
}

export default function IncidentDetail({ incident }: { incident: Incident }) {
  const maintenance = isMaintenance(incident) ? incident : undefined;

  return (
    <Detail
      navigationTitle={incident.name}
      markdown={incidentMarkdown(incident)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item text={incidentStatusLabel(incident.status)} />
          </Detail.Metadata.TagList>
          <Detail.Metadata.TagList title="Impact">
            <Detail.Metadata.TagList.Item text={impactLabel(incident.impact)} color={impactColor(incident.impact)} />
          </Detail.Metadata.TagList>
          {maintenance ? (
            <>
              <Detail.Metadata.Label title="Scheduled For" text={formatStatusDate(maintenance.scheduled_for)} />
              <Detail.Metadata.Label title="Scheduled Until" text={formatStatusDate(maintenance.scheduled_until)} />
            </>
          ) : (
            <Detail.Metadata.Label title="Started" text={formatStatusDate(incidentStartedAt(incident))} />
          )}
          {incident.resolved_at && (
            <Detail.Metadata.Label title="Resolved" text={formatStatusDate(incident.resolved_at)} />
          )}
          {incident.components.length > 0 && (
            <Detail.Metadata.TagList title="Affected Components">
              {incident.components.map((component) => (
                <Detail.Metadata.TagList.Item key={component.id} text={component.name} />
              ))}
            </Detail.Metadata.TagList>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Status Page" target={incidentURL(incident)} text="Open Incident" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Incident" url={incidentURL(incident)} />
          <Action.CopyToClipboard title="Copy Incident URL" content={incidentURL(incident)} />
          <Action.OpenInBrowser title="Open Status Page" url={STATUS_PAGE_URL} icon={Icon.Globe} />
        </ActionPanel>
      }
    />
  );
}
