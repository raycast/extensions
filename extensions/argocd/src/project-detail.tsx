import { Action, ActionPanel, Detail, Icon, Keyboard, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Project, ProjectDestination, ProjectRole, getProject, projectUrl } from "./argocd";
import { ApplicationList } from "./application-list";

function relativeTime(iso?: string): string | undefined {
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

function destinationLabel(d: ProjectDestination): string {
  const cluster = d.name ?? d.server ?? "?";
  const namespace = d.namespace ?? "*";
  return `${cluster}/${namespace}`;
}

function renderMarkdown(project: Project): string {
  const spec = project.spec ?? {};
  const sources = spec.sourceRepos ?? [];
  const destinations = spec.destinations ?? [];
  const roles = spec.roles ?? [];

  const lines: string[] = [];
  lines.push(`# ${project.metadata.name}`);
  if (spec.description) {
    lines.push("");
    lines.push(spec.description);
  }
  if (sources.length > 0) {
    lines.push("");
    lines.push("## Sources");
    for (const repo of sources) lines.push(`- \`${repo}\``);
  }
  if (destinations.length > 0) {
    lines.push("");
    lines.push("## Destinations");
    for (const d of destinations) lines.push(`- ${destinationLabel(d)}`);
  }
  if (roles.length > 0) {
    lines.push("");
    lines.push("## Roles");
    for (const r of roles) {
      const desc = r.description ? ` — ${r.description}` : "";
      lines.push(`- **${r.name}**${desc}`);
    }
  }
  return lines.join("\n");
}

function roleCountText(roles: ProjectRole[] | undefined): string {
  return String(roles?.length ?? 0);
}

export function ProjectDetail({ name }: { name: string }) {
  const { data, isLoading, error, revalidate } = useCachedPromise(async (n: string) => getProject(n), [name], {
    onError: (err) => {
      showToast({ style: Toast.Style.Failure, title: "Failed to load project", message: err.message });
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

  const project = data;
  const url = projectUrl(name);
  const created = relativeTime(project?.metadata.creationTimestamp);
  const sources = project?.spec?.sourceRepos ?? [];
  const destinations = project?.spec?.destinations ?? [];
  const roles = project?.spec?.roles ?? [];

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={name}
      markdown={project ? renderMarkdown(project) : ""}
      metadata={
        project ? (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Sources" text={String(sources.length)} />
            <Detail.Metadata.Label title="Destinations" text={String(destinations.length)} />
            <Detail.Metadata.Label title="Roles" text={roleCountText(roles)} />
            {created ? <Detail.Metadata.Label title="Created" text={created} /> : null}
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
            title="View Applications"
            icon={Icon.AppWindowGrid3x3}
            target={<ApplicationList project={name} />}
            shortcut={{ macOS: { modifiers: ["cmd"], key: "g" }, Windows: { modifiers: ["ctrl"], key: "g" } }}
          />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
          <Action.CopyToClipboard title="Copy Name" content={name} shortcut={Keyboard.Shortcut.Common.Copy} />
          <Action.CopyToClipboard title="Copy URL" content={url} />
        </ActionPanel>
      }
    />
  );
}
