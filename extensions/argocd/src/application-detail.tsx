import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  openExtensionPreferences,
  showToast,
  Toast,
  Keyboard,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import {
  Application,
  ApplicationCondition,
  ApplicationResource,
  ApplicationSource,
  applicationDeeplink,
  applicationUrl,
  getApplication,
} from "./argocd";
import { ApplicationManifest } from "./application-manifest";
import { ApplicationResourcesByKind } from "./application-resources";
import { RolloutHistory } from "./rollout-history";
import { healthIcon, syncIcon } from "./status";

const MAX_RESOURCES_IN_MARKDOWN = 25;

function statusEmoji(status: string | undefined, kind: "sync" | "health"): string {
  if (kind === "sync") {
    if (status === "Synced") return "🟢";
    if (status === "OutOfSync") return "🟡";
    return "⚪";
  }
  if (status === "Healthy") return "🟢";
  if (status === "Progressing") return "🔵";
  if (status === "Degraded") return "🔴";
  if (status === "Suspended") return "🟡";
  if (status === "Missing") return "🟠";
  return "⚪";
}

export function relativeTime(iso?: string): string | undefined {
  if (!iso) return undefined;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return iso;
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ts).toISOString().slice(0, 10);
}

export function shortRevision(rev?: string): string | undefined {
  if (!rev) return undefined;
  if (/^[0-9a-f]{7,}$/i.test(rev)) return rev.slice(0, 7);
  return rev;
}

export function repoLabel(source?: ApplicationSource): string | undefined {
  if (!source?.repoURL) return undefined;
  return source.repoURL.replace(/\.git$/, "").replace(/^https?:\/\/[^/]+\//, "");
}

function syncPolicyLabel(app: Application): string {
  const auto = app.spec?.syncPolicy?.automated;
  if (!auto) return "Manual";
  const parts = ["Auto"];
  if (auto.prune) parts.push("prune");
  if (auto.selfHeal) parts.push("self-heal");
  return parts.join(" · ");
}

function renderMarkdown(app: Application): string {
  const sync = app.status?.sync?.status;
  const health = app.status?.health?.status;
  const healthMessage = app.status?.health?.message;

  const sources = app.spec?.sources ?? (app.spec?.source ? [app.spec.source] : []);

  const op = app.status?.operationState;
  const lastSyncRev = shortRevision(op?.syncResult?.revision ?? app.status?.sync?.revision);
  const lastSyncWhen = relativeTime(op?.finishedAt ?? op?.startedAt);
  const lastSyncPhase = op?.phase;

  const resources = app.status?.resources ?? [];
  const conditions = app.status?.conditions ?? [];
  const images = app.status?.summary?.images ?? [];

  const lines: string[] = [];
  lines.push(`# ${app.metadata.name}`);
  lines.push("");
  lines.push(
    `${statusEmoji(sync, "sync")} **${sync ?? "Unknown"}** · ${statusEmoji(health, "health")} **${health ?? "Unknown"}**`,
  );
  if (healthMessage) {
    lines.push("");
    lines.push(`> ${healthMessage}`);
  }

  if (sources.length > 0) {
    lines.push("");
    lines.push("## Source");
    for (const s of sources) {
      const parts: string[] = [];
      if (s.repoURL) parts.push(`Repo: \`${repoLabel(s)}\``);
      if (s.chart) parts.push(`Chart: \`${s.chart}\``);
      if (s.path) parts.push(`Path: \`${s.path}\``);
      if (s.targetRevision) parts.push(`Revision: \`${s.targetRevision}\``);
      if (parts.length) lines.push(`- ${parts.join(" · ")}`);
    }
  }

  if (lastSyncWhen || lastSyncRev || lastSyncPhase) {
    lines.push("");
    lines.push("## Last Sync");
    const bits: string[] = [];
    if (lastSyncWhen) bits.push(lastSyncWhen);
    if (lastSyncPhase) bits.push(lastSyncPhase);
    if (lastSyncRev) bits.push(`\`${lastSyncRev}\``);
    lines.push(bits.join(" · ") || "—");
    if (op?.message) lines.push(`> ${op.message}`);
  }

  if (resources.length > 0) {
    lines.push("");
    lines.push(`## Resources (${resources.length})`);
    const shown = resources.slice(0, MAX_RESOURCES_IN_MARKDOWN);
    for (const r of shown) {
      lines.push(`- ${statusEmoji(r.status, "sync")} ${statusEmoji(r.health?.status, "health")} ${resourceLabel(r)}`);
    }
    if (resources.length > shown.length) {
      lines.push(`- _…and ${resources.length - shown.length} more_`);
    }
  }

  if (conditions.length > 0) {
    lines.push("");
    lines.push("## Conditions");
    for (const c of conditions) {
      lines.push(`- **${c.type ?? "Unknown"}**: ${c.message ?? ""}`);
    }
  }

  if (images.length > 0) {
    lines.push("");
    lines.push(`## Images (${images.length})`);
    for (const img of images) lines.push(`- \`${img}\``);
  }

  return lines.join("\n");
}

function resourceLabel(r: ApplicationResource): string {
  const kind = r.kind ?? "Resource";
  const name = r.name ?? "?";
  const ns = r.namespace ? `${r.namespace}/` : "";
  return `${kind} \`${ns}${name}\``;
}

function conditionAccessory(conditions: ApplicationCondition[] | undefined) {
  if (!conditions || conditions.length === 0) return undefined;
  return `${conditions.length} condition${conditions.length === 1 ? "" : "s"}`;
}

export function ApplicationDetail({ name }: { name: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(async (n: string) => getApplication(n), [name], {
    onError: (err) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to load application", message: err.message });
    },
  });

  if (error) {
    return (
      <Detail
        markdown={`# Failed to load\n\n\`\`\`\n${error.message}\n\`\`\``}
        actions={
          <ActionPanel>
            <Action title="Reload" icon={Icon.ArrowClockwise} onAction={revalidate} />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      />
    );
  }

  const app = data;
  const source = app?.spec?.source ?? app?.spec?.sources?.[0];
  const repoUrl = source?.repoURL;
  const url = applicationUrl(name);
  const sync = app?.status?.sync?.status;
  const health = app?.status?.health?.status;
  const revision = shortRevision(app?.status?.operationState?.syncResult?.revision ?? app?.status?.sync?.revision);
  const lastSynced = relativeTime(app?.status?.operationState?.finishedAt ?? app?.status?.reconciledAt);

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={app ? renderMarkdown(app) : ""}
      metadata={
        app ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Sync">
              <Detail.Metadata.TagList.Item text={sync ?? "Unknown"} icon={syncIcon(sync)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.TagList title="Health">
              <Detail.Metadata.TagList.Item text={health ?? "Unknown"} icon={healthIcon(health)} />
            </Detail.Metadata.TagList>
            {app.spec?.project ? <Detail.Metadata.Label title="Project" text={app.spec.project} /> : null}
            {app.spec?.destination?.name ? (
              <Detail.Metadata.Label title="Cluster" text={app.spec.destination.name} />
            ) : app.spec?.destination?.server ? (
              <Detail.Metadata.Label title="Cluster" text={app.spec.destination.server} />
            ) : null}
            {app.spec?.destination?.namespace ? (
              <Detail.Metadata.Label title="Namespace" text={app.spec.destination.namespace} />
            ) : null}
            <Detail.Metadata.Label title="Sync Policy" text={syncPolicyLabel(app)} />
            {source?.targetRevision ? (
              <Detail.Metadata.Label title="Target Revision" text={source.targetRevision} />
            ) : null}
            {revision ? <Detail.Metadata.Label title="Deployed Revision" text={revision} /> : null}
            {lastSynced ? <Detail.Metadata.Label title="Last Synced" text={lastSynced} /> : null}
            {conditionAccessory(app.status?.conditions) ? (
              <Detail.Metadata.Label
                title="Conditions"
                text={conditionAccessory(app.status?.conditions)!}
                icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
              />
            ) : null}
            {repoUrl ? (
              <>
                <Detail.Metadata.Separator />
                <Detail.Metadata.Link title="Repository" target={repoUrl} text={repoLabel(source) ?? repoUrl} />
              </>
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in ArgoCD"
            url={url}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "b" }, Windows: { modifiers: ["ctrl"], key: "b" } }}
          />
          <Action.Push
            title="Browse Resources"
            icon={Icon.AppWindowGrid3x3}
            target={<ApplicationResourcesByKind appName={name} />}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "g" }, Windows: { modifiers: ["ctrl"], key: "g" } }}
          />
          <Action.Push
            title="View Manifest"
            icon={Icon.Document}
            target={<ApplicationManifest name={name} />}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "m" }, Windows: { modifiers: ["ctrl"], key: "m" } }}
          />
          {app ? (
            <Action.Push
              title="View Rollout History"
              icon={Icon.Clock}
              target={<RolloutHistory appName={name} app={app} />}
              shortcut={{ macOS: { modifiers: ["cmd"], key: "h" }, Windows: { modifiers: ["ctrl"], key: "h" } }}
            />
          ) : null}
          {repoUrl ? <Action.OpenInBrowser title="Open Repository" url={repoUrl} icon={Icon.Globe} /> : null}
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.CopyToClipboard title="Copy Name" content={name} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.CopyToClipboard title="Copy URL" content={url} />
          <Action.CopyToClipboard title="Copy Deeplink" content={applicationDeeplink(name)} />
          {revision ? <Action.CopyToClipboard title="Copy Deployed Revision" content={revision} /> : null}
        </ActionPanel>
      }
    />
  );
}
