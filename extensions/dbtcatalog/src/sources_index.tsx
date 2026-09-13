import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchSources, buildDocsUrl, getResourceTypeIcon, getFreshnessStatus, formatRelativeTime } from "./api";
import { SourceNode, LineageNode } from "./types";
import {
  DEPLOYMENT_TYPE_INFO,
  EnvironmentWithProject,
  fetchProductionEnvironments,
  inferDeploymentType,
} from "./environment_utils";
import { openEnvironmentLineageDiagram } from "./lineage_diagram";

function SourceDetail({
  source,
  environmentId,
  projectId,
}: {
  source: SourceNode;
  environmentId: number;
  projectId: number;
}) {
  // Build markdown content
  let markdown = `# ${source.sourceName}.${source.name}\n\n`;

  if (source.description) {
    markdown += `${source.description}\n\n`;
  }

  // Freshness info
  if (source.freshness) {
    markdown += `## 🕐 Freshness\n\n`;
    markdown += `- **Status**: ${getFreshnessStatus(source.freshness.freshnessStatus)}\n`;
    if (source.freshness.maxLoadedAt) {
      markdown += `- **Max Loaded At**: ${formatRelativeTime(source.freshness.maxLoadedAt)}\n`;
    }
    markdown += "\n";
  }

  // Downstream dependencies
  if (source.children && source.children.length > 0) {
    markdown += `## ⬇️ Downstream Dependencies (${source.children.length})\n\n`;
    source.children.forEach((child: LineageNode) => {
      const icon = getResourceTypeIcon(child.resourceType);
      markdown += `- ${icon} **${child.name}** _(${child.resourceType})_\n`;
    });
    markdown += "\n";
  }

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Unique ID" text={source.uniqueId} />
          <Detail.Metadata.Label title="Source Name" text={source.sourceName} />
          <Detail.Metadata.Label title="Table Name" text={source.name} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Database" text={source.database || "N/A"} />
          <Detail.Metadata.Label title="Schema" text={source.schema || "N/A"} />
          <Detail.Metadata.Label title="Identifier" text={source.identifier || source.name} />
          <Detail.Metadata.Separator />
          {source.loader && <Detail.Metadata.Label title="Loader" text={source.loader} />}
          <Detail.Metadata.Separator />
          {source.freshness && (
            <Detail.Metadata.Label
              title="Freshness Status"
              text={getFreshnessStatus(source.freshness.freshnessStatus)}
            />
          )}
          <Detail.Metadata.Separator />
          {source.tags && source.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {source.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {source.children && (
            <Detail.Metadata.Label title="Downstream" text={`${source.children.length} dependencies`} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <Action.OpenInBrowser
              title="View in dbt Cloud Docs"
              url={buildDocsUrl(projectId, source.uniqueId)}
              icon={Icon.Globe}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Lineage">
            <Action
              title="Open dbt Cloud Lineage"
              icon={Icon.Network}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={async () => {
                await openEnvironmentLineageDiagram(
                  environmentId,
                  "dbt Cloud",
                  source.uniqueId,
                  `${source.sourceName}.${source.name}`
                );
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Unique ID" content={source.uniqueId} />
            <Action.CopyToClipboard
              title="Copy Full Path"
              content={`${source.database}.${source.schema}.${source.identifier || source.name}`}
            />
            <Action.CopyToClipboard
              title="Copy Source Ref"
              content={`{{ source('${source.sourceName}', '${source.name}') }}`}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function SourcesList({
  environmentId,
  environmentName,
  projectId,
}: {
  environmentId: number;
  environmentName: string;
  projectId: number;
}) {
  const [sources, setSources] = useState<SourceNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    async function loadSources() {
      setIsLoading(true);
      const result = await fetchSources(environmentId);
      setSources(result);
      setIsLoading(false);
    }
    loadSources();
  }, [environmentId]);

  // Filter sources
  const filteredSources = sources.filter((source) => {
    if (filter === "all") return true;
    if (filter === "fresh") return source.freshness?.freshnessStatus === "pass";
    if (filter === "warn") return source.freshness?.freshnessStatus === "warn";
    if (filter === "stale") return source.freshness?.freshnessStatus === "error";
    if (filter === "no-freshness") return !source.freshness?.freshnessStatus;
    return true;
  });

  // Group by source name
  const groupedBySourceName = filteredSources.reduce((acc, source) => {
    const sourceName = source.sourceName || "default";
    if (!acc[sourceName]) {
      acc[sourceName] = [];
    }
    acc[sourceName].push(source);
    return acc;
  }, {} as Record<string, SourceNode[]>);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sources..."
      navigationTitle={`Sources in ${environmentName}`}
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Sources" storeValue={true} onChange={(newValue) => setFilter(newValue)}>
          <List.Dropdown.Section title="All">
            <List.Dropdown.Item title="All Sources" value="all" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Freshness">
            <List.Dropdown.Item title="✅ Fresh" value="fresh" />
            <List.Dropdown.Item title="⚠️ Warning" value="warn" />
            <List.Dropdown.Item title="❌ Stale" value="stale" />
            <List.Dropdown.Item title="❓ No Freshness" value="no-freshness" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {Object.entries(groupedBySourceName)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([sourceName, sourceTables]) => (
          <List.Section key={sourceName} title={sourceName} subtitle={`${sourceTables.length} tables`}>
            {sourceTables
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((source) => (
                <List.Item
                  key={source.uniqueId}
                  icon="🗄️"
                  title={source.name}
                  subtitle={source.description?.slice(0, 50) || ""}
                  accessories={[
                    source.freshness?.freshnessStatus
                      ? { text: getFreshnessStatus(source.freshness.freshnessStatus) }
                      : {},
                    source.children && source.children.length > 0 ? { text: `⬇️ ${source.children.length}` } : {},
                  ].filter((a) => Object.keys(a).length > 0)}
                  actions={
                    <ActionPanel>
                      <Action.Push
                        title="View Details"
                        icon={Icon.Eye}
                        target={<SourceDetail source={source} environmentId={environmentId} projectId={projectId} />}
                      />
                      <Action
                        title="Open dbt Cloud Lineage"
                        icon={Icon.Network}
                        shortcut={{ modifiers: ["cmd"], key: "d" }}
                        onAction={async () => {
                          await openEnvironmentLineageDiagram(
                            environmentId,
                            "dbt Cloud",
                            source.uniqueId,
                            `${source.sourceName}.${source.name}`
                          );
                        }}
                      />
                      <Action.OpenInBrowser title="Open in dbt Cloud" url={buildDocsUrl(projectId, source.uniqueId)} />
                      <Action.CopyToClipboard title="Copy Unique ID" content={source.uniqueId} />
                      <Action.CopyToClipboard
                        title="Copy Source Ref"
                        content={`{{ source('${source.sourceName}', '${source.name}') }}`}
                      />
                    </ActionPanel>
                  }
                />
              ))}
          </List.Section>
        ))}
      {!isLoading && filteredSources.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No sources found"
          description={
            filter === "all"
              ? "This environment doesn't have any sources in the catalog yet."
              : "No sources match the selected filter"
          }
        />
      )}
    </List>
  );
}

// Environment list item for Sources - separate component to properly isolate rendering
function SourcesEnvironmentListItem({ env, projectName }: { env: EnvironmentWithProject; projectName: string }) {
  const envType = inferDeploymentType(env);
  const typeInfo = DEPLOYMENT_TYPE_INFO[envType];
  const iconConfig =
    envType === "production"
      ? { source: Icon.Checkmark, tintColor: Color.Green }
      : envType === "staging"
      ? { source: Icon.Clock, tintColor: Color.Orange }
      : envType === "development"
      ? { source: Icon.Hammer, tintColor: Color.Blue }
      : { source: Icon.Circle, tintColor: Color.SecondaryText };

  return (
    <List.Item
      key={env.id}
      icon={iconConfig}
      title={env.name}
      subtitle={env.connection?.type || ""}
      accessories={[{ text: `${typeInfo.icon} ${typeInfo.displayName}` }, { text: `dbt ${env.dbt_version}` }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Browse Sources"
            icon={Icon.List}
            target={
              <SourcesList
                environmentId={env.id}
                environmentName={`${projectName} → ${env.name}`}
                projectId={env.project_id}
              />
            }
          />
        </ActionPanel>
      }
    />
  );
}

export default function SourcesIndex() {
  const [environments, setEnvironments] = useState<EnvironmentWithProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deploymentFilter, setDeploymentFilter] = useState<string>("all");

  useEffect(() => {
    async function loadEnvironments() {
      const result = await fetchProductionEnvironments();
      setEnvironments(result);
      setIsLoading(false);

      if (result.length === 0) {
        showToast(
          Toast.Style.Failure,
          "No deployment environments",
          "The Discovery API requires at least one deployment environment"
        );
      }
    }
    loadEnvironments();
  }, []);

  // Filter environments by deployment type
  const filteredEnvironments = environments.filter((env) => {
    if (deploymentFilter === "all") return true;
    const envType = inferDeploymentType(env);
    return envType === deploymentFilter;
  });

  // Group filtered environments by project
  const groupedByProject = filteredEnvironments.reduce((acc, env) => {
    const key = `${env.project_id}-${env.projectName}`;
    if (!acc[key]) {
      acc[key] = {
        projectId: env.project_id,
        projectName: env.projectName,
        environments: [],
      };
    }
    acc[key].environments.push(env);
    return acc;
  }, {} as Record<string, { projectId: number; projectName: string; environments: EnvironmentWithProject[] }>);

  const projects = Object.values(groupedByProject).sort((a, b) => a.projectName.localeCompare(b.projectName));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Select an environment to browse sources..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Deployment Type"
          storeValue={true}
          onChange={(newValue) => setDeploymentFilter(newValue)}
        >
          <List.Dropdown.Item title="All Environments" value="all" />
          <List.Dropdown.Section title="Deployment Type">
            <List.Dropdown.Item title="✅ Production" value="production" />
            <List.Dropdown.Item title="🚧 Staging" value="staging" />
            <List.Dropdown.Item title="🔧 Development" value="development" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {projects.map(({ projectId, projectName, environments: projectEnvs }) => (
        <List.Section key={projectId} title={projectName} subtitle={`${projectEnvs.length} environment(s)`}>
          {projectEnvs.map((env) => (
            <SourcesEnvironmentListItem key={env.id} env={env} projectName={projectName} />
          ))}
        </List.Section>
      ))}
      {!isLoading && filteredEnvironments.length === 0 && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={deploymentFilter === "all" ? "No deployment environments" : `No ${deploymentFilter} environments`}
          description="Create a deployment environment and run a job to use the Sources feature"
        />
      )}
    </List>
  );
}
