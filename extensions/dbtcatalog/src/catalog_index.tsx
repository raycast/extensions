import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  fetchModels,
  fetchModelWithLineage,
  buildDocsUrl,
  buildLineageUrl,
  getResourceTypeIcon,
  getMaterializationIcon,
  getAccessColor,
  buildApiUrl,
  fetchFromApi,
} from "./api";
import { ModelNode, EnvironmentModel, LineageNode, ProjectModel, EnvironmentDeploymentType } from "./types";
import { openEnvironmentLineageDiagram } from "./lineage_diagram";

// Extended environment with project name
interface EnvironmentWithProject extends EnvironmentModel {
  projectName: string;
}

// Model extended with project/environment context for flat catalog view
interface CatalogModel extends ModelNode {
  projectName: string;
  projectId: number;
  environmentId: number;
  environmentName: string;
}

// Infer deployment type from environment name if not explicitly set
function inferDeploymentType(env: EnvironmentModel): EnvironmentDeploymentType {
  // First check if explicitly set
  if (env.deployment_type) {
    return env.deployment_type;
  }

  // Infer from environment name
  const nameLower = env.name.toLowerCase();
  if (nameLower.includes("prod") || nameLower === "production") {
    return "production";
  }
  if (nameLower.includes("stag") || nameLower === "staging" || nameLower === "stg") {
    return "staging";
  }
  if (nameLower.includes("dev") || nameLower === "development") {
    return "development";
  }
  return "general";
}

// Fetch environments and projects, then join and group them
async function fetchProductionEnvironments(): Promise<EnvironmentWithProject[]> {
  const envEndpoint = buildApiUrl("/environments/");
  const projectEndpoint = buildApiUrl("/projects/");

  const [environments, projects] = await Promise.all([
    fetchFromApi<EnvironmentModel>(envEndpoint, "Could not fetch environments"),
    fetchFromApi<ProjectModel>(projectEndpoint, "Could not fetch projects"),
  ]);

  // Create a map of project ID to name
  const projectMap = new Map<number, string>();
  projects.forEach((p) => projectMap.set(p.id, p.name));

  // Filter to deployment environments and add project name
  return environments
    .filter((env) => env.type === "deployment")
    .map((env) => ({
      ...env,
      projectName: projectMap.get(env.project_id) || env.project?.name || "Unknown Project",
    }));
}

// Select one environment per project for catalog browsing
// Priority: staging > production > any deployment env
function selectOneEnvPerProject(environments: EnvironmentWithProject[]): EnvironmentWithProject[] {
  const projectEnvs = new Map<number, EnvironmentWithProject[]>();
  for (const env of environments) {
    if (!projectEnvs.has(env.project_id)) {
      projectEnvs.set(env.project_id, []);
    }
    projectEnvs.get(env.project_id)!.push(env);
  }

  const selected: EnvironmentWithProject[] = [];
  for (const [, envs] of projectEnvs) {
    const staging = envs.find((e) => inferDeploymentType(e) === "staging");
    const production = envs.find((e) => inferDeploymentType(e) === "production");
    selected.push(staging || production || envs[0]);
  }
  return selected;
}

// Interface for expanded lineage CTE
interface ExpandedCTE {
  name: string;
  uniqueId: string;
  compiledCode: string;
  resourceType: string;
  database: string | null;
  schema: string | null;
  alias: string | null;
}

// Recursively fetch all upstream models and build expanded CTE
async function buildExpandedLineageCTE(
  environmentId: number,
  model: ModelNode,
  visited: Set<string> = new Set()
): Promise<ExpandedCTE[]> {
  const ctes: ExpandedCTE[] = [];

  if (!model.ancestors || model.ancestors.length === 0) {
    return ctes;
  }

  // Process ancestors in order (sources first, then models)
  const sortedAncestors = [...model.ancestors].sort((a, b) => {
    if (a.resourceType === "source" && b.resourceType !== "source") return -1;
    if (a.resourceType !== "source" && b.resourceType === "source") return 1;
    return 0;
  });

  for (const ancestor of sortedAncestors) {
    // Skip if already visited (avoid cycles)
    if (visited.has(ancestor.uniqueId)) continue;
    visited.add(ancestor.uniqueId);

    // Only fetch models (sources don't have compiled code)
    if (ancestor.resourceType === "model") {
      const ancestorModel = await fetchModelWithLineage(environmentId, ancestor.uniqueId);
      if (ancestorModel) {
        // Recursively get upstream CTEs first
        const upstreamCTEs = await buildExpandedLineageCTE(environmentId, ancestorModel, visited);
        ctes.push(...upstreamCTEs);

        // Add this model's CTE
        if (ancestorModel.compiledCode) {
          ctes.push({
            name: ancestorModel.name,
            uniqueId: ancestorModel.uniqueId,
            compiledCode: ancestorModel.compiledCode,
            resourceType: "model",
            database: ancestorModel.database,
            schema: ancestorModel.schema,
            alias: ancestorModel.alias,
          });
        }
      }
    }
  }

  return ctes;
}

// Build a map of table paths to CTE names for replacement
interface TableToCTEMap {
  tablePath: string; // e.g., `project`.`dataset`.`table`
  cteName: string; // e.g., stg_customers
}

// Replace table references with CTE names in the compiled code
function replaceTableRefsWithCTEs(compiledCode: string, availableCTEs: TableToCTEMap[]): string {
  let result = compiledCode;

  for (const cte of availableCTEs) {
    // Split the table path into parts (database.schema.table)
    const parts = cte.tablePath.split(".");
    if (parts.length !== 3) continue;

    const [database, schema, table] = parts;

    // Escape special regex characters in identifiers
    const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const dbEsc = escapeRegex(database);
    const schemaEsc = escapeRegex(schema);
    const tableEsc = escapeRegex(table);

    // Pattern 1: Match `db`.`schema`.`table` (BigQuery backtick style)
    // Allow optional whitespace around dots
    const backtickPattern = new RegExp(`\`${dbEsc}\`\\s*\\.\\s*\`${schemaEsc}\`\\s*\\.\\s*\`${tableEsc}\``, "gi");

    // Pattern 2: Match db.schema.table (unquoted style)
    // Use word boundaries to avoid partial matches
    const plainPattern = new RegExp(`\\b${dbEsc}\\.${schemaEsc}\\.${tableEsc}\\b`, "gi");

    result = result.replace(backtickPattern, cte.cteName);
    result = result.replace(plainPattern, cte.cteName);
  }

  return result;
}

// Generate the full expanded SQL with CTEs
function generateExpandedSQL(ctes: ExpandedCTE[], finalModel: ModelNode): string {
  if (ctes.length === 0 && finalModel.compiledCode) {
    return `-- Expanded lineage for: ${finalModel.name}\n-- No upstream models to expand\n\n${finalModel.compiledCode}`;
  }

  // Build the table-to-CTE mapping as we process CTEs
  // Each CTE's output table should be referenced by its CTE name in downstream CTEs
  const tableToCTEMap: TableToCTEMap[] = [];

  let sql = `-- Expanded lineage for: ${finalModel.name}\n`;
  sql += `-- This query combines ${ctes.length} upstream model(s) into a single executable CTE\n`;
  sql += `-- Table references have been replaced with CTE names\n\n`;
  sql += "WITH\n";

  // Add all upstream CTEs, replacing table refs as we go
  ctes.forEach((cte, index) => {
    // Replace any references to previously defined CTEs
    const processedCode = replaceTableRefsWithCTEs(cte.compiledCode, tableToCTEMap);

    sql += `-- From: ${cte.uniqueId}\n`;
    sql += `${cte.name} AS (\n`;

    // Indent the compiled code
    const indentedCode = processedCode
      .split("\n")
      .map((line) => "  " + line)
      .join("\n");
    sql += indentedCode;
    sql += "\n)";
    sql += index < ctes.length - 1 ? ",\n\n" : "\n\n";

    // Add this CTE to the map for downstream references
    // The table path is derived from the model's database.schema.alias/name
    if (cte.database && cte.schema) {
      const tablePath = `${cte.database}.${cte.schema}.${cte.alias || cte.name}`;
      tableToCTEMap.push({ tablePath, cteName: cte.name });
    }
  });

  // Add the final model's own table to the map for self-references (common in incremental models)
  // This allows references like `left join target_table` to be replaced
  if (finalModel.database && finalModel.schema) {
    const finalTablePath = `${finalModel.database}.${finalModel.schema}.${finalModel.alias || finalModel.name}`;
    // For self-references, we'll replace with a placeholder CTE name
    tableToCTEMap.push({ tablePath: finalTablePath, cteName: `__self_${finalModel.name}` });
  }

  // Add the final model, replacing table refs with CTEs
  sql += `-- Final model: ${finalModel.uniqueId}\n`;
  if (finalModel.compiledCode) {
    const processedFinalCode = replaceTableRefsWithCTEs(finalModel.compiledCode, tableToCTEMap);

    // Check if there are self-references and add a note
    const selfRefPlaceholder = `__self_${finalModel.name}`;
    if (processedFinalCode.includes(selfRefPlaceholder)) {
      sql += `-- NOTE: This model has self-references (incremental pattern). Replace __self_${finalModel.name} with your target table or remove the incremental logic for testing.\n`;
      // Optionally, we could add an empty CTE for testing:
      // sql = sql.replace('WITH\n', `WITH\n-- Placeholder for self-reference (empty for testing)\n__self_${finalModel.name} AS (SELECT * FROM UNNEST([]) WHERE FALSE),\n\n`);
    }

    sql += processedFinalCode;
  }

  return sql;
}

// Component to show expanded lineage
function ExpandedLineageView({ model, environmentId }: { model: ModelNode; environmentId: number }) {
  const [expandedSQL, setExpandedSQL] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [cteCount, setCteCount] = useState(0);

  useEffect(() => {
    async function loadExpandedLineage() {
      setIsLoading(true);
      showToast(Toast.Style.Animated, "Building expanded lineage...", "Fetching upstream models");

      try {
        // Fetch full model with lineage first
        const fullModel = await fetchModelWithLineage(environmentId, model.uniqueId);
        if (!fullModel) {
          setExpandedSQL("-- Error: Could not fetch model details");
          setIsLoading(false);
          return;
        }

        // Build the expanded CTEs
        const ctes = await buildExpandedLineageCTE(environmentId, fullModel);
        setCteCount(ctes.length);

        // Generate the full SQL
        const sql = generateExpandedSQL(ctes, fullModel);
        setExpandedSQL(sql);

        showToast(Toast.Style.Success, "Expanded lineage ready", `${ctes.length} upstream models included`);
      } catch (error) {
        setExpandedSQL(`-- Error building expanded lineage: ${error}`);
        showToast(Toast.Style.Failure, "Failed to build expanded lineage");
      }

      setIsLoading(false);
    }
    loadExpandedLineage();
  }, [model.uniqueId, environmentId]);

  const markdown = isLoading
    ? "# Loading expanded lineage...\n\nFetching and combining upstream models..."
    : `# 🔗 Expanded Lineage: ${model.name}\n\n` +
      `This query combines **${cteCount} upstream model(s)** into a single executable CTE.\n\n` +
      `\`\`\`sql\n${expandedSQL}\n\`\`\``;

  // BigQuery Console URL has ~8000 char limit, so for large queries we copy to clipboard first
  const canOpenInBigQuery = expandedSQL.length < 6000;
  const bigQueryBaseUrl = `https://console.cloud.google.com/bigquery?project=${model.database}&ws=!1m0`;
  const bigQueryUrlWithQuery = `${bigQueryBaseUrl}&query=${encodeURIComponent(expandedSQL)}`;

  const openBigQueryWithClipboard = async () => {
    await Clipboard.copy(expandedSQL);
    await showToast({
      style: Toast.Style.Success,
      title: "SQL Copied to Clipboard",
      message: "Paste (⌘V) in BigQuery editor",
    });
    await open(bigQueryBaseUrl);
  };

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy Expanded SQL"
              content={expandedSQL}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="BigQuery">
            {canOpenInBigQuery ? (
              <Action.OpenInBrowser
                title="Run in BigQuery Console"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                url={bigQueryUrlWithQuery}
              />
            ) : (
              <Action
                title="Open BigQuery (SQL Copied)"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                onAction={openBigQueryWithClipboard}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function ModelDetail({
  model,
  environmentId,
  projectId,
}: {
  model: ModelNode;
  environmentId: number;
  projectId: number;
}) {
  const [fullModel, setFullModel] = useState<ModelNode | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    async function loadModelWithLineage() {
      const result = await fetchModelWithLineage(environmentId, model.uniqueId);
      setFullModel(result);
      setIsLoading(false);
    }
    loadModelWithLineage();
  }, [model.uniqueId, environmentId]);

  const displayModel = fullModel || model;

  // Build markdown content
  let markdown = `# ${displayModel.name}\n\n`;

  if (displayModel.description) {
    markdown += `${displayModel.description}\n\n`;
  }

  // Lineage section
  if (fullModel?.ancestors && fullModel.ancestors.length > 0) {
    markdown += `## ⬆️ Upstream Dependencies (${fullModel.ancestors.length})\n\n`;
    fullModel.ancestors.forEach((ancestor: LineageNode) => {
      const icon = getResourceTypeIcon(ancestor.resourceType);
      const name = ancestor.sourceName ? `${ancestor.sourceName}.${ancestor.name}` : ancestor.name;
      markdown += `- ${icon} **${name}** _(${ancestor.resourceType})_\n`;
    });
    markdown += "\n";
  }

  if (fullModel?.children && fullModel.children.length > 0) {
    markdown += `## ⬇️ Downstream Dependencies (${fullModel.children.length})\n\n`;
    fullModel.children.forEach((child: LineageNode) => {
      const icon = getResourceTypeIcon(child.resourceType);
      markdown += `- ${icon} **${child.name}** _(${child.resourceType})_\n`;
    });
    markdown += "\n";
  }

  // Columns section (from catalog)
  const columns = displayModel.catalog?.columns;
  if (columns && columns.length > 0) {
    markdown += `## 📊 Columns (${columns.length})\n\n`;
    markdown += "| Column | Type | Description |\n";
    markdown += "|--------|------|-------------|\n";
    columns.slice(0, 25).forEach((col) => {
      // Escape pipe characters and newlines in table cells
      const escapeCell = (str: string) => str.replace(/\|/g, "\\|").replace(/\n/g, " ");
      const desc = escapeCell((col.description || "-").slice(0, 50)) + ((col.description?.length || 0) > 50 ? "…" : "");
      const type = escapeCell(col.type || "-");
      const name = escapeCell(col.name);
      markdown += `| \`${name}\` | ${type} | ${desc} |\n`;
    });
    if (columns.length > 25) {
      markdown += `\n_... and ${columns.length - 25} more columns_\n`;
    }
    markdown += "\n";
  }

  // Tests section
  if (displayModel.tests && displayModel.tests.length > 0) {
    markdown += `## 🧪 Tests (${displayModel.tests.length})\n\n`;
    displayModel.tests.forEach((test) => {
      const column = test.columnName ? ` on \`${test.columnName}\`` : "";
      markdown += `- 🧪 ${test.name}${column}\n`;
    });
    markdown += "\n";
  }

  // Code preview - full source code
  if (fullModel?.rawCode) {
    markdown += `## 📝 Source Code\n\n\`\`\`sql\n${fullModel.rawCode}\n\`\`\`\n`;
  }

  // Compiled code preview
  if (fullModel?.compiledCode) {
    markdown += `## ⚙️ Compiled Code\n\n\`\`\`sql\n${fullModel.compiledCode}\n\`\`\`\n`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Unique ID" text={displayModel.uniqueId} />
          <Detail.Metadata.Label title="Database" text={displayModel.database || "N/A"} />
          <Detail.Metadata.Label title="Schema" text={displayModel.schema || "N/A"} />
          <Detail.Metadata.Label title="Alias" text={displayModel.alias || displayModel.name} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Materialization"
            text={`${getMaterializationIcon(displayModel.materializedType)} ${displayModel.materializedType || "N/A"}`}
          />
          <Detail.Metadata.Label
            title="Access"
            text={`${getAccessColor(displayModel.access)} ${displayModel.access || "N/A"}`}
          />
          <Detail.Metadata.Label title="Language" text={displayModel.language || "sql"} />
          <Detail.Metadata.Separator />
          {displayModel.group && <Detail.Metadata.Label title="Group" text={displayModel.group} />}
          <Detail.Metadata.Separator />
          {displayModel.contractEnforced && <Detail.Metadata.Label title="Contract" text="✅ Enforced" />}
          {displayModel.latestVersion && (
            <Detail.Metadata.Label title="Version" text={`v${displayModel.latestVersion}`} />
          )}
          <Detail.Metadata.Separator />
          {displayModel.tags && displayModel.tags.length > 0 && (
            <Detail.Metadata.TagList title="Tags">
              {displayModel.tags.map((tag) => (
                <Detail.Metadata.TagList.Item key={tag} text={tag} color={Color.Blue} />
              ))}
            </Detail.Metadata.TagList>
          )}
          {fullModel?.ancestors && (
            <Detail.Metadata.Label title="Upstream" text={`${fullModel.ancestors.length} dependencies`} />
          )}
          {fullModel?.children && (
            <Detail.Metadata.Label title="Downstream" text={`${fullModel.children.length} dependencies`} />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <Action.OpenInBrowser
              title="View in dbt Cloud Docs"
              url={buildDocsUrl(projectId, displayModel.uniqueId)}
              icon={Icon.Globe}
            />
            <Action.OpenInBrowser
              title="View Lineage Graph"
              url={buildLineageUrl(projectId, displayModel.uniqueId)}
              icon={Icon.Link}
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
                  displayModel.uniqueId,
                  displayModel.name
                );
              }}
            />
            {fullModel?.ancestors && fullModel.ancestors.some((a) => a.resourceType === "model") && (
              <Action
                title="Expand Upstream Lineage to CTE"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                onAction={() => push(<ExpandedLineageView model={displayModel} environmentId={environmentId} />)}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="BigQuery">
            {displayModel.catalog?.columns && displayModel.catalog.columns.length > 0 && (
              <Action.OpenInBrowser
                title="Query in BigQuery Console"
                icon={Icon.Terminal}
                shortcut={{ modifiers: ["cmd", "shift"], key: "b" }}
                url={(() => {
                  const tablePath = `\`${displayModel.database}.${displayModel.schema}.${
                    displayModel.alias || displayModel.name
                  }\``;
                  const columns = displayModel.catalog.columns.map((col) => `  ${col.name}`).join(",\n");
                  const query = `SELECT\n${columns}\nFROM ${tablePath}\nLIMIT 100`;
                  return `https://console.cloud.google.com/bigquery?project=${
                    displayModel.database
                  }&ws=!1m0&query=${encodeURIComponent(query)}`;
                })()}
              />
            )}
            {displayModel.catalog?.columns && displayModel.catalog.columns.length > 0 && (
              <Action.CopyToClipboard
                title="Copy SELECT All Columns Query"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={(() => {
                  const tablePath = `\`${displayModel.database}.${displayModel.schema}.${
                    displayModel.alias || displayModel.name
                  }\``;
                  const columns = displayModel.catalog.columns.map((col) => `  ${col.name}`).join(",\n");
                  return `SELECT\n${columns}\nFROM ${tablePath}\nLIMIT 100`;
                })()}
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard title="Copy Unique ID" content={displayModel.uniqueId} />
            <Action.CopyToClipboard
              title="Copy Full Path"
              content={`${displayModel.database}.${displayModel.schema}.${displayModel.alias || displayModel.name}`}
            />
            {fullModel?.rawCode && <Action.CopyToClipboard title="Copy Source Code" content={fullModel.rawCode} />}
            {fullModel?.compiledCode && (
              <Action.CopyToClipboard
                title="Copy Compiled Code"
                content={fullModel.compiledCode}
                shortcut={{ modifiers: ["cmd"], key: "k" }}
              />
            )}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function CatalogIndex() {
  const [models, setModels] = useState<CatalogModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const { push } = useNavigation();

  useEffect(() => {
    async function loadAllModels() {
      const allEnvs = await fetchProductionEnvironments();
      if (allEnvs.length === 0) {
        setIsLoading(false);
        showToast(
          Toast.Style.Failure,
          "No deployment environments",
          "The Discovery API requires at least one deployment environment with a successful run"
        );
        return;
      }

      const selectedEnvs = selectOneEnvPerProject(allEnvs);

      showToast(Toast.Style.Animated, "Loading models...", `Fetching from ${selectedEnvs.length} project(s)`);

      const results = await Promise.all(
        selectedEnvs.map(async (env) => {
          const envModels = await fetchModels(env.id);
          return envModels.map(
            (m): CatalogModel => ({
              ...m,
              projectName: env.projectName,
              projectId: env.project_id,
              environmentId: env.id,
              environmentName: env.name,
            })
          );
        })
      );

      const allModels = results.flat();
      setModels(allModels);
      setIsLoading(false);
      showToast(Toast.Style.Success, `Loaded ${allModels.length} models`, `From ${selectedEnvs.length} project(s)`);
    }
    loadAllModels();
  }, []);

  // Derive unique projects for the dropdown
  const projectList = Array.from(new Map(models.map((m) => [m.projectId, m.projectName]))).sort(([, a], [, b]) =>
    a.localeCompare(b)
  );

  // Filter by project
  const filteredModels = projectFilter === "all" ? models : models.filter((m) => String(m.projectId) === projectFilter);

  // Group by project > schema
  const sections: { key: string; title: string; subtitle: string; models: CatalogModel[] }[] = [];
  const grouped = new Map<string, CatalogModel[]>();
  for (const model of filteredModels) {
    const schema = model.schema || "default";
    const key = projectFilter === "all" ? `${model.projectName} / ${schema}` : schema;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(model);
  }
  for (const [key, sectionModels] of Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b))) {
    sections.push({
      key,
      title: key,
      subtitle: `${sectionModels.length} models`,
      models: sectionModels.sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search models across all projects..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Project"
          storeValue={true}
          onChange={(newValue) => setProjectFilter(newValue)}
        >
          <List.Dropdown.Item title="All Projects" value="all" />
          {projectList.length > 1 && (
            <List.Dropdown.Section title="Projects">
              {projectList.map(([id, name]) => (
                <List.Dropdown.Item key={id} title={name} value={String(id)} />
              ))}
            </List.Dropdown.Section>
          )}
        </List.Dropdown>
      }
    >
      {sections.map(({ key, title, subtitle, models: sectionModels }) => (
        <List.Section key={key} title={title} subtitle={subtitle}>
          {sectionModels.map((model) => (
            <List.Item
              key={model.uniqueId}
              icon={getMaterializationIcon(model.materializedType)}
              title={model.name}
              subtitle={model.description?.slice(0, 50) || ""}
              accessories={[
                { text: `${getAccessColor(model.access)} ${model.access || ""}` },
                model.tests && model.tests.length > 0 ? { text: `🧪 ${model.tests.length}` } : {},
                model.catalog?.columns && model.catalog.columns.length > 0
                  ? { text: `📊 ${model.catalog.columns.length} cols` }
                  : {},
                { text: model.materializedType || "" },
              ].filter((a) => Object.keys(a).length > 0)}
              actions={
                <ActionPanel>
                  <Action
                    title="View Details & Lineage"
                    icon={Icon.Eye}
                    onAction={() =>
                      push(
                        <ModelDetail model={model} environmentId={model.environmentId} projectId={model.projectId} />
                      )
                    }
                  />
                  <Action.OpenInBrowser title="Open in dbt Cloud" url={buildDocsUrl(model.projectId, model.uniqueId)} />
                  <Action.CopyToClipboard title="Copy Unique ID" content={model.uniqueId} />
                  <Action.CopyToClipboard
                    title="Copy Full Path"
                    content={`${model.database}.${model.schema}.${model.alias || model.name}`}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
      {!isLoading && filteredModels.length === 0 && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No models found"
          description="Make sure a job has run successfully with docs generation enabled in at least one deployment environment"
        />
      )}
    </List>
  );
}
