import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  fetchModels,
  fetchModelWithLineage,
  fetchSources,
  buildDocsUrl,
  buildLineageUrl,
  getResourceTypeIcon,
  getMaterializationIcon,
} from "./api";
import { ModelNode, SourceNode, LineageNode } from "./types";
import {
  DEPLOYMENT_TYPE_INFO,
  EnvironmentWithProject,
  fetchProductionEnvironments,
  inferDeploymentType,
} from "./environment_utils";
import { openEnvironmentLineageDiagram } from "./lineage_diagram";

function LineageDetail({
  node,
  environmentId,
  projectId,
}: {
  node: ModelNode | SourceNode;
  environmentId: number;
  projectId: number;
}) {
  const [fullModel, setFullModel] = useState<ModelNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isModel = node.resourceType === "model";

  useEffect(() => {
    async function loadLineage() {
      if (isModel) {
        const result = await fetchModelWithLineage(environmentId, node.uniqueId);
        setFullModel(result);
      }
      setIsLoading(false);
    }
    loadLineage();
  }, [node.uniqueId, environmentId, isModel]);

  const displayNode = isModel && fullModel ? fullModel : node;

  // Build lineage visualization
  let markdown = `# ${getResourceTypeIcon(displayNode.resourceType)} ${displayNode.name}\n\n`;

  if (displayNode.description) {
    markdown += `> ${displayNode.description}\n\n`;
  }

  // For models, show full lineage
  if (isModel && fullModel) {
    // Upstream
    if (fullModel.ancestors && fullModel.ancestors.length > 0) {
      markdown += `## ⬆️ Upstream Dependencies\n\n`;
      markdown += "```\n";

      // Group ancestors by type
      const ancestorsByType = fullModel.ancestors.reduce((acc, a) => {
        const type = a.resourceType || "unknown";
        if (!acc[type]) acc[type] = [];
        acc[type].push(a);
        return acc;
      }, {} as Record<string, LineageNode[]>);

      Object.entries(ancestorsByType).forEach(([type, ancestors]) => {
        markdown += `${getResourceTypeIcon(type)} ${type.toUpperCase()}S:\n`;
        ancestors.forEach((ancestor) => {
          const name = ancestor.sourceName ? `${ancestor.sourceName}.${ancestor.name}` : ancestor.name;
          const location = ancestor.database && ancestor.schema ? ` (${ancestor.database}.${ancestor.schema})` : "";
          markdown += `  └── ${name}${location}\n`;
        });
        markdown += "\n";
      });
      markdown += "```\n\n";
    }

    // Current node
    markdown += `## 📍 Current Node\n\n`;
    markdown += "```\n";
    markdown += `${getResourceTypeIcon("model")} ${fullModel.name}\n`;
    markdown += `   Database: ${fullModel.database || "N/A"}\n`;
    markdown += `   Schema: ${fullModel.schema || "N/A"}\n`;
    markdown += `   Materialization: ${fullModel.materializedType || "N/A"}\n`;
    markdown += "```\n\n";

    // Downstream
    if (fullModel.children && fullModel.children.length > 0) {
      markdown += `## ⬇️ Downstream Dependencies\n\n`;
      markdown += "```\n";

      const childrenByType = fullModel.children.reduce((acc, c) => {
        const type = c.resourceType || "unknown";
        if (!acc[type]) acc[type] = [];
        acc[type].push(c);
        return acc;
      }, {} as Record<string, LineageNode[]>);

      Object.entries(childrenByType).forEach(([type, children]) => {
        markdown += `${getResourceTypeIcon(type)} ${type.toUpperCase()}S:\n`;
        children.forEach((child) => {
          markdown += `  └── ${child.name}\n`;
        });
        markdown += "\n";
      });
      markdown += "```\n\n";
    }

    // Column info from catalog
    const columns = fullModel.catalog?.columns;
    if (columns && columns.length > 0) {
      markdown += `## 📊 Columns (${columns.length})\n\n`;
      markdown += "| Column | Type | Description |\n";
      markdown += "|--------|------|-------------|\n";
      columns.slice(0, 15).forEach((col) => {
        // Escape pipe characters and newlines in table cells
        const escapeCell = (str: string) => str.replace(/\|/g, "\\|").replace(/\n/g, " ");
        const desc = escapeCell((col.description || "-").slice(0, 40));
        const type = escapeCell(col.type || "-");
        const name = escapeCell(col.name);
        markdown += `| \`${name}\` | ${type} | ${desc} |\n`;
      });
      if (columns.length > 15) {
        markdown += `\n_... and ${columns.length - 15} more columns_\n`;
      }
    }
  } else if (!isModel) {
    // For sources, show children
    const sourceNode = node as SourceNode;
    if (sourceNode.children && sourceNode.children.length > 0) {
      markdown += `## ⬇️ Downstream Dependencies\n\n`;
      markdown += "```\n";
      sourceNode.children.forEach((child) => {
        markdown += `${getResourceTypeIcon(child.resourceType)} ${child.name}\n`;
      });
      markdown += "```\n\n";
    }
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Resource Type"
            text={`${getResourceTypeIcon(displayNode.resourceType)} ${displayNode.resourceType}`}
          />
          <Detail.Metadata.Label title="Unique ID" text={displayNode.uniqueId} />
          <Detail.Metadata.Separator />
          {isModel && fullModel && (
            <>
              <Detail.Metadata.Label title="Upstream" text={`${fullModel.ancestors?.length || 0} dependencies`} />
              <Detail.Metadata.Label title="Downstream" text={`${fullModel.children?.length || 0} dependencies`} />
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label title="Materialization" text={fullModel.materializedType || "N/A"} />
              <Detail.Metadata.Label title="Access" text={fullModel.access || "N/A"} />
            </>
          )}
          {!isModel && (
            <Detail.Metadata.Label
              title="Downstream"
              text={`${(node as SourceNode).children?.length || 0} dependencies`}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {isModel && fullModel && (
            <>
              <Action
                title="Open dbt Cloud Lineage"
                icon={Icon.Network}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={async () => {
                  await openEnvironmentLineageDiagram(environmentId, "dbt Cloud", fullModel.uniqueId, fullModel.name);
                }}
              />
            </>
          )}
          <Action.OpenInBrowser
            title="View Full Lineage in dbt Cloud"
            url={buildLineageUrl(projectId, displayNode.uniqueId)}
            icon={Icon.Globe}
          />
          <Action.OpenInBrowser title="View in Docs" url={buildDocsUrl(projectId, displayNode.uniqueId)} />
          {isModel && fullModel?.ancestors && fullModel.ancestors.length > 0 && (
            <ActionPanel.Submenu title="Explore Upstream" icon={Icon.ChevronUp}>
              {fullModel.ancestors.map((ancestor) => (
                <Action
                  key={ancestor.uniqueId}
                  title={`${getResourceTypeIcon(ancestor.resourceType)} ${ancestor.name}`}
                  onAction={() => {
                    // Navigate to ancestor (would need to fetch it)
                    showToast(Toast.Style.Animated, "Loading...", ancestor.name);
                  }}
                />
              ))}
            </ActionPanel.Submenu>
          )}
          <Action.CopyToClipboard title="Copy Unique ID" content={displayNode.uniqueId} />
        </ActionPanel>
      }
    />
  );
}

function LineageList({
  environmentId,
  environmentName,
  projectId,
}: {
  environmentId: number;
  environmentName: string;
  projectId: number;
}) {
  const [models, setModels] = useState<ModelNode[]>([]);
  const [sources, setSources] = useState<SourceNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [resourceType, setResourceType] = useState<string>("all");

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [modelsResult, sourcesResult] = await Promise.all([
        fetchModels(environmentId),
        fetchSources(environmentId),
      ]);
      setModels(modelsResult);
      setSources(sourcesResult);
      setIsLoading(false);
    }
    loadData();
  }, [environmentId]);

  // Combined and filtered list
  const allNodes: (ModelNode | SourceNode)[] = [];
  if (resourceType === "all" || resourceType === "model") {
    allNodes.push(...models);
  }
  if (resourceType === "all" || resourceType === "source") {
    allNodes.push(...sources);
  }

  // Group by resource type
  const groupedNodes = allNodes.reduce((acc, node) => {
    const type = node.resourceType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(node);
    return acc;
  }, {} as Record<string, (ModelNode | SourceNode)[]>);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search nodes to explore lineage..."
      navigationTitle={`Lineage Explorer - ${environmentName}`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Resource Type"
          storeValue={true}
          onChange={(newValue) => setResourceType(newValue)}
        >
          <List.Dropdown.Item title="All Resources" value="all" />
          <List.Dropdown.Item title="📦 Models Only" value="model" />
          <List.Dropdown.Item title="🗄️ Sources Only" value="source" />
        </List.Dropdown>
      }
    >
      {Object.entries(groupedNodes)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([type, nodes]) => (
          <List.Section
            key={type}
            title={`${getResourceTypeIcon(type)} ${type.charAt(0).toUpperCase() + type.slice(1)}s`}
            subtitle={`${nodes.length} items`}
          >
            {nodes
              .sort((a, b) => a.name.localeCompare(b.name))
              .slice(0, 50) // Limit for performance
              .map((node) => {
                const isModel = node.resourceType === "model";
                const modelNode = node as ModelNode;
                const sourceNode = node as SourceNode;

                return (
                  <List.Item
                    key={node.uniqueId}
                    icon={getResourceTypeIcon(node.resourceType)}
                    title={node.name}
                    subtitle={node.description?.slice(0, 40) || ""}
                    accessories={[
                      isModel && modelNode.materializedType
                        ? { text: getMaterializationIcon(modelNode.materializedType) }
                        : {},
                      !isModel && sourceNode.sourceName ? { text: sourceNode.sourceName } : {},
                      { text: `${node.schema || ""}` },
                    ].filter((a) => Object.keys(a).length > 0)}
                    actions={
                      <ActionPanel>
                        <Action.Push
                          title="View Lineage"
                          icon={Icon.Eye}
                          target={<LineageDetail node={node} environmentId={environmentId} projectId={projectId} />}
                        />
                        <Action.OpenInBrowser
                          title="Open Lineage in dbt Cloud"
                          url={buildLineageUrl(projectId, node.uniqueId)}
                        />
                        <Action.CopyToClipboard title="Copy Unique ID" content={node.uniqueId} />
                      </ActionPanel>
                    }
                  />
                );
              })}
          </List.Section>
        ))}
      {!isLoading && allNodes.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No resources found"
          description="This environment doesn't have any models or sources in the catalog yet."
        />
      )}
    </List>
  );
}

// Environment list item for Lineage - separate component to properly isolate rendering
function LineageEnvironmentListItem({ env, projectName }: { env: EnvironmentWithProject; projectName: string }) {
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
            title="Explore Lineage"
            icon={Icon.Link}
            target={
              <LineageList
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

export default function LineageIndex() {
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
      searchBarPlaceholder="Select an environment to explore lineage..."
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
            <LineageEnvironmentListItem key={env.id} env={env} projectName={projectName} />
          ))}
        </List.Section>
      ))}
      {!isLoading && filteredEnvironments.length === 0 && (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title={deploymentFilter === "all" ? "No deployment environments" : `No ${deploymentFilter} environments`}
          description="Create a deployment environment and run a job to explore lineage"
        />
      )}
    </List>
  );
}
