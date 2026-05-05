import { Color, Icon, List } from "@raycast/api";

import { getProjectTitle } from "../scanner";
import { ProjectRecord, ResolvedProjectApp, RuntimeStatus } from "../types";

interface ProjectDetailProps {
  project: ProjectRecord;
  runtimeStatus?: RuntimeStatus;
  ideApp: ResolvedProjectApp;
  terminalApp: ResolvedProjectApp;
}

export function ProjectDetail({ project, runtimeStatus, ideApp, terminalApp }: ProjectDetailProps) {
  const activePorts = runtimeStatus?.ports ?? [];
  const markdown = [
    `# ${escapeMarkdown(getProjectTitle(project))}`,
    project.description?.trim() || "_No description yet. Use **Edit Project** to add one._",
    project.isEmptyDirectory ? "> Empty project directory. Add metadata when you are ready." : undefined,
    runtimeStatus?.isActive
      ? `**Status:** Active on ${activePorts.map((port) => `:${port}`).join(", ")}`
      : "**Status:** Inactive",
  ]
    .filter(Boolean)
    .join("\n\n");

  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Path" text={project.path} icon={Icon.Folder} />
          <List.Item.Detail.Metadata.Label title="Scan Root" text={project.rootLabel} icon={Icon.HardDrive} />
          <List.Item.Detail.Metadata.Label
            title="State"
            text={{
              value: project.archived ? "Archived" : project.pinned ? "Pinned" : "Active",
              color: project.archived ? Color.SecondaryText : project.pinned ? Color.Yellow : Color.Green,
            }}
          />
          <List.Item.Detail.Metadata.Separator />
          <MetadataTagList title="Frameworks" values={project.frameworks} emptyValue="Unknown" />
          <MetadataTagList title="Languages" values={project.languages} emptyValue="Unknown" />
          <List.Item.Detail.Metadata.Label
            title="IDE"
            text={formatResolvedApp(ideApp)}
            icon={ideApp.source === "project" ? Icon.AppWindowSidebarLeft : Icon.AppWindow}
          />
          <List.Item.Detail.Metadata.Label
            title="Terminal"
            text={formatResolvedApp(terminalApp)}
            icon={ideApp.source === "project" ? Icon.Terminal : Icon.Terminal}
          />
          {activePorts.length > 0 ? (
            <List.Item.Detail.Metadata.TagList title="Ports">
              {activePorts.map((port) => (
                <List.Item.Detail.Metadata.TagList.Item key={port} text={`:${port}`} color={Color.Green} />
              ))}
            </List.Item.Detail.Metadata.TagList>
          ) : (
            <List.Item.Detail.Metadata.Label title="Ports" text="None" />
          )}
          <List.Item.Detail.Metadata.Separator />
          {project.gitRemotes.length > 0 ? (
            project.gitRemotes.map((remote) => (
              <List.Item.Detail.Metadata.Link
                key={`${remote.name}:${remote.url}`}
                title={`Git ${remote.name}`}
                target={remote.url}
                text={remote.host ?? remote.url}
              />
            ))
          ) : (
            <List.Item.Detail.Metadata.Label title="Git" text="Not configured" />
          )}
          {project.urls.length > 0 || project.urlsFromPackageMetadata.length > 0 ? (
            Array.from(new Set([...project.urls, ...project.urlsFromPackageMetadata])).map((url, index) => (
              <List.Item.Detail.Metadata.Link key={url} title={`URL ${index + 1}`} target={url} text={url} />
            ))
          ) : (
            <List.Item.Detail.Metadata.Label title="URLs" text="None" />
          )}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function formatResolvedApp(app: ResolvedProjectApp): string {
  return `${app.name}${app.source === "project" ? " (Project Override)" : " (Default)"}`;
}

function MetadataTagList({ title, values, emptyValue }: { title: string; values: string[]; emptyValue: string }) {
  if (values.length === 0) {
    return <List.Item.Detail.Metadata.Label title={title} text={emptyValue} />;
  }

  return (
    <List.Item.Detail.Metadata.TagList title={title}>
      {values.map((value) => (
        <List.Item.Detail.Metadata.TagList.Item key={value} text={value} />
      ))}
    </List.Item.Detail.Metadata.TagList>
  );
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}
