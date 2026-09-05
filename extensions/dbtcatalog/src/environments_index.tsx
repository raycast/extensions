import { List, showToast, Toast, ActionPanel, Action, Icon, Color, Detail, useNavigation } from "@raycast/api";
import { useEffect, useState, useCallback } from "react";
import { returnEnvironments } from "./fetch_environments";
import { EnvironmentsFetchResponse, EnvironmentModel } from "./types";
import { buildDbtCloudUrl, formatRelativeTime } from "./api";
import { openEnvironmentLineageDiagram } from "./lineage_diagram";

function getEnvironmentIcon(env: EnvironmentModel): { source: Icon; tintColor: Color } {
  const envType = env.type?.toLowerCase() || "";
  if (envType === "deployment") {
    return { source: Icon.Upload, tintColor: Color.Green };
  }
  if (envType === "development") {
    return { source: Icon.Terminal, tintColor: Color.Blue };
  }
  return { source: Icon.Globe, tintColor: Color.SecondaryText };
}

function getEnvironmentTypeEmoji(env: EnvironmentModel): string {
  const envType = env.type?.toLowerCase() || "";
  if (envType === "deployment") return "🚀";
  if (envType === "development") return "💻";
  return "🌍";
}

// Environment Detail Component
function EnvironmentDetail({ environment }: { environment: EnvironmentModel }) {
  const envUrl = buildDbtCloudUrl(`/projects/${environment.project_id}/environments/${environment.id}`);
  const projectUrl = buildDbtCloudUrl(`/projects/${environment.project_id}`);
  const jobsUrl = buildDbtCloudUrl(`/projects/${environment.project_id}/jobs`);
  const docsUrl = buildDbtCloudUrl(`/projects/${environment.project_id}/docs`);

  const markdown = `
# ${environment.name}

${getEnvironmentTypeEmoji(environment)} **${environment.type || "Unknown Type"}** Environment

---

## Configuration

| Property | Value |
|----------|-------|
| **Environment ID** | ${environment.id} |
| **Project** | ${environment.project?.name || environment.project_id} |
| **Type** | ${environment.type || "Unknown"} |
| **State** | ${environment.state === 1 ? "✅ Active" : "❌ Inactive"} |
| **dbt Version** | ${environment.dbt_version || "Not set"} |

## Git Configuration

| Setting | Value |
|---------|-------|
| **Custom Branch** | ${environment.use_custom_branch ? "✅ Yes" : "❌ No"} |
${environment.custom_branch ? `| **Branch Name** | \`${environment.custom_branch}\` |` : ""}

${
  environment.connection
    ? `
## Connection

| Property | Value |
|----------|-------|
| **Name** | ${environment.connection.name} |
| **Type** | ${environment.connection.type} |
| **Adapter** | ${environment.connection.adapter_version || "N/A"} |
`
    : "## Connection\n\n_No connection configured_"
}

${
  environment.credentials
    ? `
## Credentials

| Property | Value |
|----------|-------|
| **Type** | ${environment.credentials.type} |
| **Schema** | \`${environment.credentials.schema}\` |
| **Target Name** | ${environment.credentials.target_name || "N/A"} |
`
    : ""
}

## Features

${environment.supports_docs ? "✅ Supports Documentation" : "❌ Does not support Documentation"}

## Timestamps

| Event | Time |
|-------|------|
| **Created** | ${formatRelativeTime(environment.created_at)} |
| **Updated** | ${formatRelativeTime(environment.updated_at)} |
`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={environment.name}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Type"
            text={environment.type || "Unknown"}
            icon={getEnvironmentIcon(environment)}
          />
          <Detail.Metadata.Label title="Project" text={environment.project?.name || `ID: ${environment.project_id}`} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="dbt Version" text={environment.dbt_version || "Not set"} />
          {environment.connection && (
            <Detail.Metadata.Label
              title="Connection"
              text={`${environment.connection.type} - ${environment.connection.name}`}
            />
          )}
          {environment.credentials?.schema && (
            <Detail.Metadata.Label title="Schema" text={environment.credentials.schema} />
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Created" text={formatRelativeTime(environment.created_at)} />
          <Detail.Metadata.Label title="Updated" text={formatRelativeTime(environment.updated_at)} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Link title="Open Environment" target={envUrl} text="View in dbt Cloud" />
          <Detail.Metadata.Link title="Project" target={projectUrl} text="View Project" />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={envUrl} title="Open in dbt Cloud" />
          <Action
            title="Explore Lineage Graph"
            icon={Icon.Network}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              await openEnvironmentLineageDiagram(environment.id, environment.name);
            }}
          />
          <ActionPanel.Section title="Navigate">
            <Action.OpenInBrowser url={projectUrl} title="View Project" icon={Icon.Document} />
            <Action.OpenInBrowser url={jobsUrl} title="View Jobs" icon={Icon.Hammer} />
            {environment.supports_docs && (
              <Action.OpenInBrowser url={docsUrl} title="View Documentation" icon={Icon.Document} />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Environment ID" content={environment.id.toString()} />
            <Action.CopyToClipboard title="Copy Environment Name" content={environment.name} />
            {environment.credentials?.schema && (
              <Action.CopyToClipboard title="Copy Schema" content={environment.credentials.schema} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

interface EnvironmentListItemProps {
  environment: EnvironmentModel;
}

const EnvironmentListItem = ({ environment }: EnvironmentListItemProps): JSX.Element => {
  const { push } = useNavigation();
  const envUrl = buildDbtCloudUrl(`/projects/${environment.project_id}/environments/${environment.id}`);
  const envIcon = getEnvironmentIcon(environment);

  return (
    <List.Item
      id={environment.id.toString()}
      title={environment.name}
      subtitle={`${getEnvironmentTypeEmoji(environment)} ${environment.type || "Unknown Type"}`}
      icon={envIcon}
      accessories={[
        { text: `dbt ${environment.dbt_version || "N/A"}` },
        { text: environment.connection?.type || "No connection" },
        { text: environment.credentials?.schema || "" },
      ]}
      actions={
        <ActionPanel>
          <Action
            title="View Details"
            icon={Icon.Eye}
            onAction={() => push(<EnvironmentDetail environment={environment} />)}
          />
          <Action
            title="Explore Lineage Graph"
            icon={Icon.Network}
            shortcut={{ modifiers: ["cmd"], key: "d" }}
            onAction={async () => {
              await openEnvironmentLineageDiagram(environment.id, environment.name);
            }}
          />
          <Action.OpenInBrowser url={envUrl} title="Open in dbt Cloud" />
          {environment.supports_docs && (
            <Action.OpenInBrowser
              url={buildDbtCloudUrl(`/projects/${environment.project_id}/docs`)}
              title="View Documentation"
              icon={Icon.Document}
            />
          )}
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Environment ID" content={environment.id.toString()} />
            <Action.CopyToClipboard title="Copy Environment Name" content={environment.name} />
            {environment.credentials?.schema && (
              <Action.CopyToClipboard title="Copy Schema" content={environment.credentials.schema} />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};

type EnvFilter = "all" | "deployment" | "development";

export default function EnvironmentsList() {
  const [environments, setEnvironments] = useState<EnvironmentsFetchResponse>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<EnvFilter>("all");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await returnEnvironments();
      setEnvironments(response);
    } catch (error) {
      showToast(Toast.Style.Failure, "Failed loading Environments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEnvs = environments.filter((env) => {
    if (filter === "all") return true;
    return env.type?.toLowerCase() === filter;
  });

  // Group environments by project name
  const envsByProject = filteredEnvs.reduce((acc, env) => {
    const projectKey = env.project?.name || `Project ${env.project_id}`;
    if (!acc[projectKey]) {
      acc[projectKey] = [];
    }
    acc[projectKey].push(env);
    return acc;
  }, {} as Record<string, EnvironmentModel[]>);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Filter environments by name..."
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Type" storeValue onChange={(value) => setFilter(value as EnvFilter)}>
          <List.Dropdown.Item title="All Environments" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="🚀 Deployment" value="deployment" />
          <List.Dropdown.Item title="💻 Development" value="development" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No environments found"
        description={filter !== "all" ? "Try changing the filter" : "No environments in your account"}
        icon="icon_64p.png"
      />

      {Object.entries(envsByProject).map(([projectName, projectEnvs]) => (
        <List.Section key={projectName} title={projectName} subtitle={`${projectEnvs.length} environments`}>
          {projectEnvs.map((env) => (
            <EnvironmentListItem key={env.id} environment={env} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
