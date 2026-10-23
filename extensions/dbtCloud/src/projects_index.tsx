import { List, showToast, Toast, ActionPanel, Action, Icon, Color, Detail, useNavigation } from "@raycast/api";
import { dateAccessory, DateLabel } from "./display";
import { Shortcuts } from "./shortcuts";
import { JSX, useEffect, useState, useCallback } from "react";
import { returnProjects } from "./fetch_projects";
import { ProjectsFetchResponse, ProjectModel } from "./types";
import { buildDbtCloudUrl, formatRelativeTime } from "./api";
import { ProjectGoTo } from "./navigation";

function getProjectStateIcon(state: number): { source: Icon; tintColor: Color } {
  switch (state) {
    case 1:
      return { source: Icon.Checkmark, tintColor: Color.Green };
    case 2:
      return { source: Icon.XmarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Circle, tintColor: Color.SecondaryText };
  }
}

function getProjectStateText(state: number): string {
  switch (state) {
    case 1:
      return "Active";
    case 2:
      return "Deleted";
    default:
      return "Unknown";
  }
}

// Project Detail Component
export function ProjectDetail({ project }: { project: ProjectModel }) {
  const projectUrl = buildDbtCloudUrl(`/projects/${project.id}`);
  const jobsUrl = buildDbtCloudUrl(`/projects/${project.id}/jobs`);
  const environmentsUrl = buildDbtCloudUrl(`/projects/${project.id}/environments`);
  const docsUrl = buildDbtCloudUrl(`/projects/${project.id}/docs`);
  const settingsUrl = buildDbtCloudUrl(`/projects/${project.id}/settings`);

  const markdown = `
# ${project.name}

${project.description || "_No description provided_"}

---

## Project Details

| Property | Value |
|----------|-------|
| **Project ID** | ${project.id} |
| **Status** | ${getProjectStateText(project.state)} |
| **Created** | ${formatRelativeTime(project.created_at)} |
| **Updated** | ${formatRelativeTime(project.updated_at)} |

## Configuration

| Setting | Value |
|---------|-------|
| **dbt Subdirectory** | ${project.dbt_project_subdirectory || "Root"} |
| **Connection ID** | ${project.connection_id || "Not configured"} |
| **Repository ID** | ${project.repository_id || "Not configured"} |

${
  project.repository
    ? `
## Repository

| Property | Value |
|----------|-------|
| **Name** | ${project.repository.full_name} |
| **URL** | ${project.repository.remote_url} |
| **Clone Strategy** | ${project.repository.git_clone_strategy} |
`
    : ""
}

${
  project.connection
    ? `
## Connection

| Property | Value |
|----------|-------|
| **Name** | ${project.connection.name} |
| **Type** | ${project.connection.type} |
| **Adapter** | ${project.connection.adapter_version || "N/A"} |
`
    : ""
}

## Features

${project.docs_job_id ? "✅ Documentation Job Configured" : "❌ No Documentation Job"}
${project.freshness_job_id ? "✅ Source Freshness Job Configured" : "❌ No Source Freshness Job"}
${project.semantic_layer_config_id ? "✅ Semantic Layer Configured" : "❌ No Semantic Layer"}
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={project.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Status">
            <Detail.Metadata.TagList.Item
              text={getProjectStateText(project.state)}
              color={project.state === 1 ? Color.Green : Color.SecondaryText}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Separator />
          {project.repository && (
            <Detail.Metadata.Label title="Repository" text={project.repository.full_name} icon={Icon.Code} />
          )}
          {project.connection && (
            <Detail.Metadata.Label
              title="Connection"
              text={`${project.connection.type} · ${project.connection.name}`}
              icon={Icon.Plug}
            />
          )}
          <Detail.Metadata.Separator />
          <DateLabel title="Created" date={project.created_at} />
          <DateLabel title="Updated" date={project.updated_at} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Project ID" text={project.id.toString()} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="dbt Cloud" target={projectUrl} text="Open Project" />
          <Detail.Metadata.Link title="" target={jobsUrl} text="Open Jobs" />
          <Detail.Metadata.Link title="" target={environmentsUrl} text="Open Environments" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ProjectGoTo projectId={project.id} projectName={project.name} omit={["details"]} />
          <ActionPanel.Section title="Open in dbt Cloud">
            <Action.OpenInBrowser url={projectUrl} title="Open Project in dbt Cloud" shortcut={Shortcuts.webProject} />
            <Action.OpenInBrowser
              url={jobsUrl}
              title="Open Jobs in dbt Cloud"
              shortcut={Shortcuts.webJob}
              icon={Icon.Hammer}
            />
            <Action.OpenInBrowser
              url={environmentsUrl}
              title="Open Environments in dbt Cloud"
              shortcut={Shortcuts.webEnvironment}
              icon={Icon.Globe}
            />
            {project.docs_job_id && (
              <Action.OpenInBrowser
                url={docsUrl}
                title="Open Documentation in dbt Cloud"
                shortcut={Shortcuts.webDocs}
                icon={Icon.Document}
              />
            )}
            <Action.OpenInBrowser
              url={settingsUrl}
              title="Open Project Settings in dbt Cloud"
              shortcut={Shortcuts.webSettings}
              icon={Icon.Gear}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Project ID"
              shortcut={Shortcuts.copyId}
              content={project.id.toString()}
            />
            <Action.CopyToClipboard title="Copy Project Name" shortcut={Shortcuts.copyName} content={project.name} />
            {project.repository?.remote_url && (
              <Action.CopyToClipboard
                title="Copy Repository URL"
                shortcut={Shortcuts.copyPath}
                content={project.repository.remote_url}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface ProjectListItemProps {
  project: ProjectModel;
}

const ProjectListItem = ({ project }: ProjectListItemProps): JSX.Element => {
  const { push } = useNavigation();
  const projectUrl = buildDbtCloudUrl(`/projects/${project.id}`);
  const jobsUrl = buildDbtCloudUrl(`/projects/${project.id}/jobs`);
  const docsUrl = buildDbtCloudUrl(`/projects/${project.id}/docs`);
  const stateIcon = getProjectStateIcon(project.state);

  return (
    <List.Item
      id={project.id.toString()}
      title={project.name}
      subtitle={project.description || "No description"}
      icon={stateIcon}
      accessories={[
        ...(project.connection?.type ? [{ tag: project.connection.type, tooltip: "Connection" }] : []),
        {
          tag: {
            value: getProjectStateText(project.state),
            color: project.state === 1 ? Color.Green : Color.SecondaryText,
          },
        },
        dateAccessory(project.updated_at, "Updated"),
      ]}
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            shortcut={Shortcuts.details}
            icon={Icon.Eye}
            onAction={() => push(<ProjectDetail project={project} />)}
          />
          <ProjectGoTo projectId={project.id} projectName={project.name} omit={["details"]} />
          <ActionPanel.Section title="Open in dbt Cloud">
            <Action.OpenInBrowser url={projectUrl} title="Open Project in dbt Cloud" shortcut={Shortcuts.webProject} />
            <Action.OpenInBrowser
              url={jobsUrl}
              title="Open Jobs in dbt Cloud"
              shortcut={Shortcuts.webJob}
              icon={Icon.Hammer}
            />
            {project.docs_job_id && (
              <Action.OpenInBrowser
                url={docsUrl}
                title="Open Documentation in dbt Cloud"
                shortcut={Shortcuts.webDocs}
                icon={Icon.Document}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Project ID"
              shortcut={Shortcuts.copyId}
              content={project.id.toString()}
            />
            <Action.CopyToClipboard title="Copy Project Name" shortcut={Shortcuts.copyName} content={project.name} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

export default function ProjectsList() {
  const [projects, setProjects] = useState<ProjectsFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await returnProjects();
      setProjects(response);
    } catch {
      showToast(Toast.Style.Failure, "Failed loading Projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Separate active and inactive projects
  const activeProjects = projects.filter((p) => p.state === 1);
  const inactiveProjects = projects.filter((p) => p.state !== 1);

  return (
    <List isLoading={loading} searchBarPlaceholder="Filter projects by name..." throttle>
      <List.EmptyView
        title="No projects found"
        description="No projects found in your dbt Cloud account"
        icon="icon_64p.png"
      />

      {activeProjects.length > 0 && (
        <List.Section title="Active Projects" subtitle={`${activeProjects.length} projects`}>
          {activeProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
        </List.Section>
      )}

      {inactiveProjects.length > 0 && (
        <List.Section title="Inactive Projects" subtitle={`${inactiveProjects.length} projects`}>
          {inactiveProjects.map((project) => (
            <ProjectListItem key={project.id} project={project} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
