import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { providerFor } from "../lib/providers";
import type { Incident, Service, ServiceStatus } from "../lib/providers/types";
import { componentEmoji, humanize, indicatorColor, indicatorEmoji } from "../lib/status-format";
import { formatDateTime, timeAgo } from "../lib/time";

const IMPACT_COLOR: Record<string, Color> = {
  none: Color.SecondaryText,
  minor: Color.Yellow,
  major: Color.Orange,
  critical: Color.Red,
};

/** Statuspage returns updates newest-first; show them oldest-first so the stage progression reads top-down. */
function chronological(incident: Incident): Incident["updates"] {
  return [...incident.updates].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

function incidentSection(incident: Incident): string {
  const lines: string[] = [`## ${incident.name}`, ""];
  const latest = incident.updates[0];
  if (latest?.body) lines.push(latest.body, "");

  if (incident.affectedComponents.length > 0) {
    lines.push("**Affected components:** " + incident.affectedComponents.join(", "), "");
  }

  lines.push("### History", "");
  for (const update of chronological(incident)) {
    lines.push(`**${humanize(update.status)}** · ${formatDateTime(update.createdAt)}`, "");
    if (update.body) lines.push(update.body, "");
  }
  return lines.join("\n");
}

function buildMarkdown(service: Service, status: ServiceStatus): string {
  const parts: string[] = [
    `# ${service.name}`,
    "",
    `${indicatorEmoji(status.indicator)} **${status.description}**`,
    "",
  ];

  if (status.activeIncidents.length > 0) {
    parts.push(...status.activeIncidents.map(incidentSection));
  } else {
    parts.push("_No active incidents._", "");
  }

  const degraded = status.components.filter((component) => component.status !== "operational");
  if (degraded.length > 0) {
    parts.push("### Affected Components", "");
    for (const component of degraded) {
      parts.push(`- ${componentEmoji(component.status)} ${component.name} — ${humanize(component.status)}`);
    }
  }
  return parts.join("\n");
}

interface IncidentDetailProps {
  service: Service;
  initialStatus?: ServiceStatus;
}

export function IncidentDetail({ service, initialStatus }: IncidentDetailProps) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (svc: Service) => providerFor(svc).getStatus(svc),
    [service],
    { initialData: initialStatus },
  );

  const status = data ?? initialStatus;
  const firstIncident = status?.activeIncidents[0];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`${service.name} — ${status ? status.description : "Loading…"}`}
      markdown={status ? buildMarkdown(service, status) : "Loading…"}
      metadata={
        status ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Service" text={service.name} icon={Icon.Globe} />
            <Detail.Metadata.TagList title="Current Status">
              <Detail.Metadata.TagList.Item text={status.description} color={indicatorColor(status.indicator)} />
            </Detail.Metadata.TagList>
            {firstIncident && (
              <>
                <Detail.Metadata.TagList title="Impact">
                  <Detail.Metadata.TagList.Item
                    text={humanize(firstIncident.impact)}
                    color={IMPACT_COLOR[firstIncident.impact] ?? Color.SecondaryText}
                  />
                </Detail.Metadata.TagList>
                <Detail.Metadata.Label title="Current Stage" text={humanize(firstIncident.status)} />
                <Detail.Metadata.Label
                  title="Started"
                  text={`${formatDateTime(firstIncident.createdAt)} (${timeAgo(firstIncident.createdAt)})`}
                />
                <Detail.Metadata.Label title="Last Update" text={timeAgo(firstIncident.updatedAt)} />
                {firstIncident.affectedComponents.length > 0 && (
                  <Detail.Metadata.TagList title="Components">
                    {firstIncident.affectedComponents.map((name) => (
                      <Detail.Metadata.TagList.Item key={name} text={name} color={Color.Orange} />
                    ))}
                  </Detail.Metadata.TagList>
                )}
              </>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Status Page" target={service.statusUrl} text={service.statusUrl} />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open Status Page" url={service.statusUrl} />
          {firstIncident?.shortlink && (
            <Action.OpenInBrowser title="Open Incident" icon={Icon.ExclamationMark} url={firstIncident.shortlink} />
          )}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
