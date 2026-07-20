import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import type { StatusSnapshot } from "@/types";
import {
  componentStatusLabel,
  componentStatusListIcon,
  indicatorListIcon,
} from "@/lib/status-colors";
import {
  buildUptimeDetailMarkdown,
  averageComponentUptime,
  resolveUptimePercent,
} from "@/lib/uptime-chart";
import { formatUptimePercent } from "@/lib/snapshot-text";

interface SiteDetailProps {
  snapshot: StatusSnapshot;
}

function buildIncidentMarkdown(
  incident: StatusSnapshot["incidents"][number],
): string {
  return `### ${incident.name}\n\n${incident.body ?? incident.status}`;
}

function regionFilterSummary(
  filter: NonNullable<StatusSnapshot["regionFilter"]>,
): string | undefined {
  const parts: string[] = [];

  if (filter.hiddenIncidents > 0) {
    parts.push(
      `${filter.hiddenIncidents} incident${filter.hiddenIncidents === 1 ? "" : "s"} hidden`,
    );
  }
  if (filter.hiddenComponents > 0) {
    parts.push(
      `${filter.hiddenComponents} component${filter.hiddenComponents === 1 ? "" : "s"} hidden`,
    );
  }

  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function buildOverviewMarkdown(snapshot: StatusSnapshot): string {
  const overviewUptime =
    snapshot.uptimePercent ?? averageComponentUptime(snapshot.components);
  const uptimeMarkdown = buildUptimeDetailMarkdown(
    snapshot.historyDays,
    overviewUptime,
  );
  const incidentsMarkdown =
    snapshot.incidents.length > 0
      ? snapshot.incidents.map(buildIncidentMarkdown).join("\n\n---\n\n")
      : "No active incidents.";

  if (!uptimeMarkdown) {
    return incidentsMarkdown;
  }

  return `${uptimeMarkdown}\n\n---\n\n${incidentsMarkdown}`;
}

export function SiteDetail({ snapshot }: SiteDetailProps) {
  const overviewIcon = snapshot.error
    ? { source: Icon.QuestionMark, tintColor: Color.SecondaryText }
    : indicatorListIcon(snapshot.indicator);
  const regionFilterNote = snapshot.regionFilter
    ? regionFilterSummary(snapshot.regionFilter)
    : undefined;
  const overviewSubtitle = [
    snapshot.error ?? `${snapshot.components.length} components`,
    regionFilterNote,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <List navigationTitle={snapshot.pageName} isShowingDetail>
      <List.Section title="Overview">
        <List.Item
          title={snapshot.overallDescription}
          subtitle={overviewSubtitle}
          icon={overviewIcon}
          detail={
            <List.Item.Detail
              markdown={buildOverviewMarkdown(snapshot)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Status"
                    text={snapshot.overallDescription}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Uptime"
                    text={formatUptimePercent(snapshot.uptimePercent)}
                  />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Fetched"
                    text={new Date(snapshot.fetchedAt).toLocaleString()}
                  />
                  {snapshot.regionFilter && (
                    <>
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Regions"
                        text={snapshot.regionFilter.monitored.join(", ")}
                      />
                      {regionFilterNote && (
                        <>
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Region Filter"
                            text={regionFilterNote}
                          />
                        </>
                      )}
                    </>
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                url={snapshot.pageUrl}
                title="Open Status Page"
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {snapshot.incidents.length > 0 && (
        <List.Section title="Active Incidents">
          {snapshot.incidents.map((incident) => (
            <List.Item
              key={incident.id}
              title={incident.name}
              subtitle={incident.status}
              icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
              detail={
                <List.Item.Detail
                  markdown={buildIncidentMarkdown(incident)}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text={incident.status}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          ))}
        </List.Section>
      )}

      <List.Section title="Components">
        {snapshot.components.map((component) => {
          const uptime = resolveUptimePercent(
            component.historyDays,
            component.uptimePercent,
          );
          const uptimeMarkdown = buildUptimeDetailMarkdown(
            component.historyDays,
            component.uptimePercent,
          );

          return (
            <List.Item
              key={component.id}
              title={component.name}
              icon={componentStatusListIcon(component.status)}
              accessories={
                uptime !== null
                  ? [{ text: formatUptimePercent(uptime) }]
                  : undefined
              }
              detail={
                <List.Item.Detail
                  markdown={uptimeMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Name"
                        text={component.name}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text={componentStatusLabel(component.status)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Uptime"
                        text={formatUptimePercent(uptime)}
                      />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Fetched"
                        text={new Date(snapshot.fetchedAt).toLocaleString()}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    url={snapshot.pageUrl}
                    title="Open Status Page"
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
