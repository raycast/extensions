import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  fetchSources,
  buildDocsUrl,
  getResourceTypeIcon,
  getFreshnessStatus,
  formatRelativeTime,
  buildApiUrl,
  fetchFromApi,
} from "./api";
import { SourceNode, EnvironmentModel, LineageNode, ProjectModel, EnvironmentDeploymentType } from "./types";
import { openEnvironmentLineageDiagram } from "./lineage_diagram";

// Extended environment with project name
interface EnvironmentWithProject extends EnvironmentModel {
  projectName: string;
}

// Grouped structure for hierarchical navigation by deployment type
interface DeploymentTypeGroup {
  deploymentType: EnvironmentDeploymentType;
  displayName: string;
  description: string;
  icon: string;
  projects: {
    projectId: number;
    projectName: string;
    environments: EnvironmentWithProject[];
  }[];
}

// Deployment type display info
const DEPLOYMENT_TYPE_INFO: Record<
  EnvironmentDeploymentType,
  { displayName: string; description: string; icon: string; sortOrder: number }
> = {
  production: {
    displayName: "Production",
    description: "End users interact with this environment",
    icon: "✅",
    sortOrder: 1,
  },
  staging: {
    displayName: "Staging",
    description: "Pre-production testing environment",
    icon: "🔶",
    sortOrder: 2,
  },
  development: {
    displayName: "Development",
    description: "Engineers work in this environment",
    icon: "🔧",
    sortOrder: 3,
  },
  general: {
    displayName: "General",
    description: "Unclassified deployment environment",
    icon: "📦",
    sortOrder: 4,
  },
};

// Infer deployment type from environment name if not explicitly set
function inferDeploymentType(env: EnvironmentModel): EnvironmentDeploymentType {
  if (env.deployment_type) {
    return env.deployment_type;
  }
  const nameLower = env.name.toLowerCase();
  if (nameLower.includes("prod") || nameLower === "production") return "production";
  if (nameLower.includes("stag") || nameLower === "staging" || nameLower === "stg") return "staging";
  if (nameLower.includes("dev") || nameLower === "development") return "development";
  return "general";
}

// Fetch environments and projects, then join them
async function fetchProductionEnvironments(): Promise<EnvironmentWithProject[]> {
  const envEndpoint = buildApiUrl("/environments/");
  const projectEndpoint = buildApiUrl("/projects/");

  const [environments, projects] = await Promise.all([
    fetchFromApi<EnvironmentModel>(envEndpoint, "Could not fetch environments"),
    fetchFromApi<ProjectModel>(projectEndpoint, "Could not fetch projects"),
  ]);

  const projectMap = new Map<number, string>();
  projects.forEach((p) => projectMap.set(p.id, p.name));

  return environments
    .filter((env) => env.type === "deployment")
    .map((env) => ({
      ...env,
      projectName: projectMap.get(env.project_id) || env.project?.name || "Unknown Project",
    }));
}

// Group environments by deployment type, then by project
function groupByDeploymentType(environments: EnvironmentWithProject[]): DeploymentTypeGroup[] {
  const typeGroups = new Map<
    EnvironmentDeploymentType,
    Map<number, { projectName: string; environments: EnvironmentWithProject[] }>
  >();

  for (const env of environments) {
    const deploymentType = inferDeploymentType(env);
    if (!typeGroups.has(deploymentType)) typeGroups.set(deploymentType, new Map());
    const projectMap = typeGroups.get(deploymentType)!;
    if (!projectMap.has(env.project_id))
      projectMap.set(env.project_id, { projectName: env.projectName, environments: [] });
    projectMap.get(env.project_id)!.environments.push(env);
  }

  const result: DeploymentTypeGroup[] = [];
  for (const [deploymentType, projectMap] of typeGroups.entries()) {
    const info = DEPLOYMENT_TYPE_INFO[deploymentType];
    result.push({
      deploymentType,
      displayName: info.displayName,
      description: info.description,
      icon: info.icon,
      projects: Array.from(projectMap.entries())
        .map(([projectId, data]) => ({
          projectId,
          projectName: data.projectName,
          environments: data.environments.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.projectName.localeCompare(b.projectName)),
    });
  }
  return result.sort(
    (a, b) => DEPLOYMENT_TYPE_INFO[a.deploymentType].sortOrder - DEPLOYMENT_TYPE_INFO[b.deploymentType].sortOrder
  );
}

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

// Projects list within a deployment type for Sources
function ProjectsList({
  deploymentType,
  projects,
}: {
  deploymentType: DeploymentTypeGroup;
  projects: DeploymentTypeGroup["projects"];
}) {
  return (
    <List
      searchBarPlaceholder={`Search projects in ${deploymentType.displayName}...`}
      navigationTitle={`${deploymentType.icon} ${deploymentType.displayName} - Select Project`}
    >
      <List.Section
        title={`${deploymentType.icon} ${deploymentType.displayName}`}
        subtitle={`${projects.length} project(s)`}
      >
        {projects.map(({ projectId, projectName, environments }) => {
          const envCount = environments.length;
          const primaryEnv = environments[0];

          return (
            <List.Item
              key={`${projectId}`}
              icon={Icon.Document}
              title={projectName}
              subtitle={envCount > 1 ? `${envCount} environments` : primaryEnv.name}
              accessories={[{ text: `dbt ${primaryEnv.dbt_version}` }, { text: primaryEnv.connection?.type || "" }]}
              actions={
                <ActionPanel>
                  {envCount === 1 ? (
                    <Action.Push
                      title="Browse Sources"
                      icon={Icon.List}
                      target={
                        <SourcesList
                          environmentId={primaryEnv.id}
                          environmentName={`${projectName} / ${deploymentType.displayName}`}
                          projectId={primaryEnv.project_id}
                        />
                      }
                    />
                  ) : (
                    <Action.Push
                      title="Select Environment"
                      icon={Icon.ArrowRight}
                      target={
                        <EnvironmentsList
                          projectName={projectName}
                          deploymentTypeName={deploymentType.displayName}
                          environments={environments}
                        />
                      }
                    />
                  )}
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

// Environment selection within a project (when multiple environments exist)
function EnvironmentsList({
  projectName,
  deploymentTypeName,
  environments,
}: {
  projectName: string;
  deploymentTypeName: string;
  environments: EnvironmentWithProject[];
}) {
  return (
    <List
      searchBarPlaceholder={`Select environment for ${projectName}...`}
      navigationTitle={`${projectName} - Select Environment`}
    >
      <List.Section title={projectName} subtitle={`${environments.length} environments`}>
        {environments.map((env) => (
          <List.Item
            key={env.id}
            icon={Icon.Globe}
            title={env.name}
            subtitle={env.connection?.type || ""}
            accessories={[{ text: `dbt ${env.dbt_version}` }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Browse Sources"
                  icon={Icon.List}
                  target={
                    <SourcesList
                      environmentId={env.id}
                      environmentName={`${projectName} / ${env.name}`}
                      projectId={env.project_id}
                    />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
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
