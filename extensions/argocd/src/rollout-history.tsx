import { Action, ActionPanel, Color, Detail, Icon, List } from "@raycast/api";
import { useMemo } from "react";
import {
  Application,
  ApplicationSource,
  DeploymentHistoryItem,
  applicationRollbackUrl,
  applicationUrl,
} from "./argocd";
import { relativeTime, repoLabel, shortRevision } from "./application-detail";

function sourceOf(item: DeploymentHistoryItem): ApplicationSource | undefined {
  return item.source ?? item.sources?.[0];
}

function deploymentUrl(appName: string, item: DeploymentHistoryItem): string {
  return item.id !== undefined ? applicationRollbackUrl(appName, item.id) : applicationUrl(appName);
}

function revisionOf(item: DeploymentHistoryItem): string | undefined {
  return item.revision ?? item.revisions?.[0];
}

function titleFor(item: DeploymentHistoryItem): string {
  const rev = revisionOf(item);
  return shortRevision(rev) ?? sourceOf(item)?.targetRevision ?? sourceOf(item)?.chart ?? "(unknown revision)";
}

function durationLabel(startIso?: string, endIso?: string): string | undefined {
  if (!startIso || !endIso) return undefined;
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return undefined;
  const seconds = Math.round((end - start) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  return remSeconds ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
}

export function RolloutHistory({ appName, app }: { appName: string; app: Application }) {
  const currentRevision = app.status?.operationState?.syncResult?.revision ?? app.status?.sync?.revision;

  const history = useMemo(
    () => [...(app.status?.history ?? [])].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [app.status?.history],
  );

  return (
    <List navigationTitle={`${appName} · Rollout History`} searchBarPlaceholder="Filter by revision...">
      {history.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No rollout history"
          description="This application has no recorded deployments."
        />
      ) : (
        <List.Section title="Deployments" subtitle={`${history.length}`}>
          {history.map((item, i) => {
            const source = sourceOf(item);
            const revision = revisionOf(item);
            const isCurrent = Boolean(revision && currentRevision && revision === currentRevision);
            const deployedAt = relativeTime(item.deployedAt);

            const accessories: List.Item.Accessory[] = [];
            if (isCurrent) accessories.push({ tag: { value: "Current", color: Color.Green } });
            if (deployedAt) accessories.push({ text: deployedAt, tooltip: item.deployedAt });

            return (
              <List.Item
                key={`${item.id ?? i}`}
                icon={Icon.Clock}
                title={titleFor(item)}
                subtitle={repoLabel(source)}
                accessories={accessories}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Sidebar}
                      target={<DeploymentDetail appName={appName} item={item} isCurrent={isCurrent} />}
                    />
                    <Action.OpenInBrowser
                      title="Open in ArgoCD"
                      url={deploymentUrl(appName, item)}
                      shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
                    />
                    {revision ? <Action.CopyToClipboard title="Copy Revision" content={revision} /> : null}
                    {source?.repoURL ? (
                      <Action.OpenInBrowser title="Open Repository" url={source.repoURL} icon={Icon.Globe} />
                    ) : null}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}

function absoluteTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  return new Date(ts).toLocaleString();
}

function sourceLines(source?: ApplicationSource): string[] {
  if (!source) return [];
  const lines: string[] = [];
  if (source.repoURL) lines.push(`- Repo: \`${repoLabel(source)}\``);
  if (source.chart) lines.push(`- Chart: \`${source.chart}\``);
  if (source.path) lines.push(`- Path: \`${source.path}\``);
  if (source.targetRevision) lines.push(`- Target Revision: \`${source.targetRevision}\``);
  return lines;
}

function renderDeploymentMarkdown(item: DeploymentHistoryItem, isCurrent: boolean): string {
  const source = sourceOf(item);
  const sources = item.sources && item.sources.length > 1 ? item.sources : undefined;
  const revisions = item.revisions && item.revisions.length > 1 ? item.revisions : undefined;

  const lines: string[] = [];
  lines.push(`# ${titleFor(item)}`);
  lines.push("");
  const badges: string[] = [];
  if (item.id !== undefined) badges.push(`Deployment #${item.id}`);
  if (isCurrent) badges.push("**Current**");
  if (badges.length) lines.push(badges.join(" · "));

  lines.push("");
  lines.push("## Timing");
  const deployedAbs = absoluteTime(item.deployedAt);
  const deployedRel = relativeTime(item.deployedAt);
  const startedAbs = absoluteTime(item.deployStartedAt);
  const startedRel = relativeTime(item.deployStartedAt);
  const duration = durationLabel(item.deployStartedAt, item.deployedAt);
  if (deployedAbs) lines.push(`- Deployed: ${deployedAbs}${deployedRel ? ` (${deployedRel})` : ""}`);
  if (startedAbs) lines.push(`- Deploy started: ${startedAbs}${startedRel ? ` (${startedRel})` : ""}`);
  if (duration) lines.push(`- Duration: ${duration}`);

  if (sources) {
    lines.push("");
    lines.push(`## Sources (${sources.length})`);
    sources.forEach((s, i) => {
      lines.push(`**${i + 1}.** \`${revisions?.[i] ? shortRevision(revisions[i]) : (s.targetRevision ?? "?")}\``);
      lines.push(...sourceLines(s));
    });
  } else if (source) {
    lines.push("");
    lines.push("## Source");
    lines.push(...sourceLines(source));
  }

  return lines.join("\n");
}

function DeploymentDetail({
  appName,
  item,
  isCurrent,
}: {
  appName: string;
  item: DeploymentHistoryItem;
  isCurrent: boolean;
}) {
  const source = sourceOf(item);
  const revision = revisionOf(item);

  return (
    <Detail
      navigationTitle={`${appName} · ${titleFor(item)}`}
      markdown={renderDeploymentMarkdown(item, isCurrent)}
      metadata={
        <Detail.Metadata>
          {item.id !== undefined ? <Detail.Metadata.Label title="Deployment" text={`#${item.id}`} /> : null}
          {revision ? <Detail.Metadata.Label title="Revision" text={revision} /> : null}
          {isCurrent ? (
            <Detail.Metadata.TagList title="Status">
              <Detail.Metadata.TagList.Item text="Current" color={Color.Green} />
            </Detail.Metadata.TagList>
          ) : null}
          {absoluteTime(item.deployedAt) ? (
            <Detail.Metadata.Label title="Deployed At" text={absoluteTime(item.deployedAt)!} />
          ) : null}
          {absoluteTime(item.deployStartedAt) ? (
            <Detail.Metadata.Label title="Deploy Started At" text={absoluteTime(item.deployStartedAt)!} />
          ) : null}
          {durationLabel(item.deployStartedAt, item.deployedAt) ? (
            <Detail.Metadata.Label title="Duration" text={durationLabel(item.deployStartedAt, item.deployedAt)!} />
          ) : null}
          {source?.repoURL ? (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Link
                title="Repository"
                target={source.repoURL}
                text={repoLabel(source) ?? source.repoURL}
              />
            </>
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in ArgoCD"
            url={deploymentUrl(appName, item)}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
          />
          {revision ? <Action.CopyToClipboard title="Copy Revision" content={revision} /> : null}
          {source?.repoURL ? (
            <Action.OpenInBrowser title="Open Repository" url={source.repoURL} icon={Icon.Globe} />
          ) : null}
        </ActionPanel>
      }
    />
  );
}
