import { Action, ActionPanel, Color, Detail, Icon, List, showToast, Toast, open } from "@raycast/api";
import { useEffect, useState } from "react";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  fetchModels,
  fetchModelWithLineage,
  fetchSources,
  buildDocsUrl,
  buildLineageUrl,
  getResourceTypeIcon,
  getMaterializationIcon,
  buildApiUrl,
  fetchFromApi,
} from "./api";
import { ModelNode, SourceNode, EnvironmentModel, LineageNode, ProjectModel, EnvironmentDeploymentType } from "./types";
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
  staging: { displayName: "Staging", description: "Pre-production testing environment", icon: "🔶", sortOrder: 2 },
  development: {
    displayName: "Development",
    description: "Engineers work in this environment",
    icon: "🔧",
    sortOrder: 3,
  },
  general: { displayName: "General", description: "Unclassified deployment environment", icon: "📦", sortOrder: 4 },
};

// Infer deployment type from environment name if not explicitly set
function inferDeploymentType(env: EnvironmentModel): EnvironmentDeploymentType {
  if (env.deployment_type) return env.deployment_type;
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

// Generate an interactive HTML lineage diagram using Mermaid.js
async function openInteractiveLineageDiagram(
  node: ModelNode,
  fullModel: ModelNode,
  environmentName: string
): Promise<void> {
  // Generate Mermaid flowchart
  const nodeId = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "_");
  const currentNodeId = nodeId(fullModel.name);

  let mermaidCode = `flowchart TB\n`;
  mermaidCode += `  %% Styling\n`;
  mermaidCode += `  classDef source fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#01579b\n`;
  mermaidCode += `  classDef model fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#2e7d32\n`;
  mermaidCode += `  classDef seed fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#e65100\n`;
  mermaidCode += `  classDef snapshot fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#7b1fa2\n`;
  mermaidCode += `  classDef current fill:#ffeb3b,stroke:#f57f17,stroke-width:3px,color:#000\n`;
  mermaidCode += `  classDef test fill:#ffcdd2,stroke:#c62828,stroke-width:1px,color:#c62828\n\n`;

  // Add upstream nodes
  const upstreamNodes: string[] = [];
  if (fullModel.ancestors && fullModel.ancestors.length > 0) {
    mermaidCode += `  %% Upstream Dependencies\n`;
    for (const ancestor of fullModel.ancestors) {
      const id = nodeId(ancestor.name);
      const label = ancestor.sourceName ? `${ancestor.sourceName}.${ancestor.name}` : ancestor.name;
      const resourceType = ancestor.resourceType?.toLowerCase() || "model";

      if (resourceType === "source") {
        mermaidCode += `  ${id}[("🗄️ ${label}")]\n`;
        mermaidCode += `  class ${id} source\n`;
      } else if (resourceType === "seed") {
        mermaidCode += `  ${id}[/"🌱 ${label}"/]\n`;
        mermaidCode += `  class ${id} seed\n`;
      } else if (resourceType === "snapshot") {
        mermaidCode += `  ${id}[["📸 ${label}"]]\n`;
        mermaidCode += `  class ${id} snapshot\n`;
      } else {
        mermaidCode += `  ${id}["📦 ${label}"]\n`;
        mermaidCode += `  class ${id} model\n`;
      }
      upstreamNodes.push(id);
    }
    mermaidCode += `\n`;
  }

  // Add current node
  mermaidCode += `  %% Current Model\n`;
  const matIcon =
    fullModel.materializedType === "view"
      ? "👁️"
      : fullModel.materializedType === "table"
      ? "📋"
      : fullModel.materializedType === "incremental"
      ? "➕"
      : "📦";
  mermaidCode += `  ${currentNodeId}[["${matIcon} ${fullModel.name}"]]\n`;
  mermaidCode += `  class ${currentNodeId} current\n\n`;

  // Add downstream nodes
  const downstreamNodes: string[] = [];
  if (fullModel.children && fullModel.children.length > 0) {
    mermaidCode += `  %% Downstream Dependencies\n`;
    for (const child of fullModel.children) {
      const id = nodeId(child.name);
      const resourceType = child.resourceType?.toLowerCase() || "model";

      if (resourceType === "test") {
        mermaidCode += `  ${id}(("🧪"))\n`;
        mermaidCode += `  class ${id} test\n`;
      } else {
        mermaidCode += `  ${id}["📦 ${child.name}"]\n`;
        mermaidCode += `  class ${id} model\n`;
      }
      downstreamNodes.push(id);
    }
    mermaidCode += `\n`;
  }

  // Add edges
  mermaidCode += `  %% Edges\n`;
  for (const upId of upstreamNodes) {
    mermaidCode += `  ${upId} --> ${currentNodeId}\n`;
  }
  for (const downId of downstreamNodes) {
    mermaidCode += `  ${currentNodeId} --> ${downId}\n`;
  }

  // Generate HTML with Mermaid.js
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lineage: ${fullModel.name}</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      min-height: 100vh;
      color: #fff;
    }
    .header {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .header h1 {
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header .env {
      font-size: 14px;
      opacity: 0.7;
    }
    .legend {
      display: flex;
      gap: 16px;
      font-size: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    .stats {
      display: flex;
      gap: 24px;
      padding: 12px 24px;
      background: rgba(255,255,255,0.05);
      font-size: 14px;
    }
    .stat { display: flex; align-items: center; gap: 6px; }
    .stat-value { font-weight: 600; color: #4fc3f7; }
    .diagram-container {
      padding: 24px;
      display: flex;
      justify-content: center;
      overflow: auto;
    }
    .mermaid {
      background: rgba(255,255,255,0.95);
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    }
    .controls {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      gap: 8px;
    }
    .btn {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
    }
    .btn-primary {
      background: #4fc3f7;
      color: #000;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: #fff;
    }
    .btn:hover { transform: scale(1.05); }
    .info-panel {
      position: fixed;
      bottom: 24px;
      left: 24px;
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      padding: 16px;
      border-radius: 12px;
      font-size: 13px;
      max-width: 300px;
    }
    .info-panel h3 { margin-bottom: 8px; font-size: 14px; }
    .info-row { display: flex; justify-content: space-between; margin: 4px 0; }
    .info-label { opacity: 0.7; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>🔗 ${fullModel.name}</h1>
      <div class="env">${environmentName}</div>
    </div>
    <div class="legend">
      <div class="legend-item"><div class="legend-dot" style="background:#e1f5fe;border:1px solid #01579b"></div> Source</div>
      <div class="legend-item"><div class="legend-dot" style="background:#e8f5e9;border:1px solid #2e7d32"></div> Model</div>
      <div class="legend-item"><div class="legend-dot" style="background:#fff3e0;border:1px solid #e65100"></div> Seed</div>
      <div class="legend-item"><div class="legend-dot" style="background:#f3e5f5;border:1px solid #7b1fa2"></div> Snapshot</div>
      <div class="legend-item"><div class="legend-dot" style="background:#ffeb3b;border:2px solid #f57f17"></div> Current</div>
    </div>
  </div>
  <div class="stats">
    <div class="stat">⬆️ Upstream: <span class="stat-value">${fullModel.ancestors?.length || 0}</span></div>
    <div class="stat">⬇️ Downstream: <span class="stat-value">${fullModel.children?.length || 0}</span></div>
    <div class="stat">📊 Columns: <span class="stat-value">${fullModel.catalog?.columns?.length || 0}</span></div>
    <div class="stat">🧪 Tests: <span class="stat-value">${fullModel.tests?.length || 0}</span></div>
    <div class="stat">📦 Materialization: <span class="stat-value">${fullModel.materializedType || "N/A"}</span></div>
  </div>
  <div class="diagram-container">
    <pre class="mermaid">
${mermaidCode}
    </pre>
  </div>
  <div class="info-panel">
    <h3>📋 Model Details</h3>
    <div class="info-row"><span class="info-label">Database</span><span>${fullModel.database || "N/A"}</span></div>
    <div class="info-row"><span class="info-label">Schema</span><span>${fullModel.schema || "N/A"}</span></div>
    <div class="info-row"><span class="info-label">Access</span><span>${fullModel.access || "N/A"}</span></div>
    ${
      fullModel.tags && fullModel.tags.length > 0
        ? `<div class="info-row"><span class="info-label">Tags</span><span>${fullModel.tags.join(", ")}</span></div>`
        : ""
    }
  </div>
  <div class="controls">
    <button class="btn btn-secondary" onclick="window.print()">🖨️ Print</button>
    <button class="btn btn-primary" onclick="location.reload()">🔄 Refresh</button>
  </div>
  <script>
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'base',
      themeVariables: {
        fontSize: '14px',
        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif'
      },
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis',
        rankSpacing: 60,
        nodeSpacing: 40
      }
    });
  </script>
</body>
</html>`;

  // Write to temp file and open
  const tempDir = os.tmpdir();
  const fileName = `dbt-lineage-${nodeId(fullModel.name)}-${Date.now()}.html`;
  const filePath = path.join(tempDir, fileName);

  fs.writeFileSync(filePath, html);
  await open(`file://${filePath}`);
}

// Generate dbt Cloud-style interactive lineage diagram using Cytoscape.js with FULL project DAG
async function openDbtCloudLineageDiagram(
  selectedModel: ModelNode,
  allModels: ModelNode[],
  allSources: SourceNode[],
  environmentName: string,
  environmentId: number
): Promise<void> {
  const nodeId = (name: string) => name.replace(/[^a-zA-Z0-9]/g, "_");

  // Build complete node and edge maps from all models and sources
  const nodesMap = new Map<
    string,
    {
      id: string;
      label: string;
      type: string;
      uniqueId: string;
      database?: string;
      schema?: string;
      materialization?: string;
      description?: string;
      tags?: string[];
      ancestorIds?: string[];
      childIds?: string[];
    }
  >();
  const edgesSet = new Set<string>();
  const edges: Array<{ data: { source: string; target: string } }> = [];

  // Add all sources first
  for (const source of allSources) {
    const id = nodeId(source.uniqueId);
    nodesMap.set(source.uniqueId, {
      id,
      label: `${source.sourceName}.${source.name}`,
      type: "source",
      uniqueId: source.uniqueId,
      database: source.database || undefined,
      schema: source.schema || undefined,
      description: source.description || undefined,
      tags: source.tags,
      childIds: source.children?.map((c) => c.uniqueId) || [],
    });

    // Add edges from source to children
    if (source.children) {
      for (const child of source.children) {
        const edgeKey = `${source.uniqueId}->${child.uniqueId}`;
        if (!edgesSet.has(edgeKey)) {
          edgesSet.add(edgeKey);
          edges.push({ data: { source: id, target: nodeId(child.uniqueId) } });
        }
      }
    }
  }

  // Add all models with their relationships
  for (const model of allModels) {
    const id = nodeId(model.uniqueId);
    nodesMap.set(model.uniqueId, {
      id,
      label: model.name,
      type: "model",
      uniqueId: model.uniqueId,
      database: model.database || undefined,
      schema: model.schema || undefined,
      materialization: model.materializedType || undefined,
      description: model.description || undefined,
      tags: model.tags,
      ancestorIds: model.ancestors?.map((a) => a.uniqueId) || [],
      childIds: model.children?.map((c) => c.uniqueId) || [],
    });

    // Add edges from ancestors to this model
    if (model.ancestors) {
      for (const ancestor of model.ancestors) {
        // Add ancestor node if not exists (could be seed/snapshot not in allModels)
        if (!nodesMap.has(ancestor.uniqueId)) {
          nodesMap.set(ancestor.uniqueId, {
            id: nodeId(ancestor.uniqueId),
            label: ancestor.sourceName ? `${ancestor.sourceName}.${ancestor.name}` : ancestor.name,
            type: ancestor.resourceType?.toLowerCase() || "model",
            uniqueId: ancestor.uniqueId,
            database: (ancestor as any).database,
            schema: (ancestor as any).schema,
          });
        }

        const edgeKey = `${ancestor.uniqueId}->${model.uniqueId}`;
        if (!edgesSet.has(edgeKey)) {
          edgesSet.add(edgeKey);
          edges.push({ data: { source: nodeId(ancestor.uniqueId), target: id } });
        }
      }
    }

    // Add edges from this model to children
    if (model.children) {
      for (const child of model.children) {
        // Add child node if not exists
        if (!nodesMap.has(child.uniqueId)) {
          nodesMap.set(child.uniqueId, {
            id: nodeId(child.uniqueId),
            label: child.name,
            type: child.resourceType?.toLowerCase() || "model",
            uniqueId: child.uniqueId,
          });
        }

        const edgeKey = `${model.uniqueId}->${child.uniqueId}`;
        if (!edgesSet.has(edgeKey)) {
          edgesSet.add(edgeKey);
          edges.push({ data: { source: id, target: nodeId(child.uniqueId) } });
        }
      }
    }
  }

  // Convert nodes map to array with isSelected flag
  const nodes = Array.from(nodesMap.values()).map((n) => ({
    data: {
      ...n,
      isSelected: n.uniqueId === selectedModel.uniqueId,
    },
  }));

  // Stats for the header
  const modelCount = allModels.length;
  const sourceCount = allSources.length;
  const edgeCount = edges.length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lineage: ${selectedModel.name} | ${environmentName}</title>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
  <script src="https://unpkg.com/dagre@0.8.5/dist/dagre.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.min.js"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #0d1117;
      color: #c9d1d9;
      height: 100vh;
      overflow: hidden;
    }
    
    /* Header */
    .header {
      background: #161b22;
      border-bottom: 1px solid #30363d;
      padding: 12px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 100;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 15px;
      color: #ff694a;
    }
    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #8b949e;
    }
    .breadcrumb span { color: #c9d1d9; }
    .stats-bar {
      display: flex;
      gap: 16px;
      font-size: 12px;
      color: #8b949e;
    }
    .stats-bar .stat { display: flex; align-items: center; gap: 4px; }
    .stats-bar .stat-value { color: #58a6ff; font-weight: 600; }
    
    /* Legend */
    .legend {
      display: flex;
      gap: 16px;
      font-size: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .legend-icon {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
    }
    
    /* Main container */
    #cy {
      position: absolute;
      top: 56px;
      left: 0;
      right: 340px;
      bottom: 0;
      background: #0d1117;
    }
    
    /* Right Panel */
    .side-panel {
      position: fixed;
      top: 56px;
      right: 0;
      width: 340px;
      bottom: 0;
      background: #161b22;
      border-left: 1px solid #30363d;
      overflow-y: auto;
      padding: 20px;
    }
    .panel-section {
      margin-bottom: 24px;
    }
    .panel-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #8b949e;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .panel-title .count {
      background: #30363d;
      padding: 2px 6px;
      border-radius: 10px;
      font-size: 10px;
    }
    .model-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #fff;
      word-break: break-all;
    }
    .model-type {
      font-size: 13px;
      color: #8b949e;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .model-type-badge {
      background: #238636;
      color: #fff;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    }
    .model-type-badge.source { background: #1f6feb; }
    .model-type-badge.seed { background: #a371f7; }
    .model-type-badge.snapshot { background: #f85149; }
    .info-grid {
      display: grid;
      gap: 12px;
    }
    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .info-label {
      font-size: 11px;
      color: #8b949e;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .info-value {
      font-size: 13px;
      color: #c9d1d9;
      font-family: 'SF Mono', Consolas, monospace;
      background: #0d1117;
      padding: 6px 10px;
      border-radius: 6px;
      border: 1px solid #30363d;
      word-break: break-all;
    }
    .description {
      font-size: 13px;
      color: #8b949e;
      line-height: 1.5;
      background: #0d1117;
      padding: 10px;
      border-radius: 6px;
      border: 1px solid #30363d;
    }
    .dep-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-height: 200px;
      overflow-y: auto;
    }
    .dep-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: #0d1117;
      border-radius: 6px;
      border: 1px solid #30363d;
      font-size: 13px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .dep-item:hover {
      border-color: #58a6ff;
      background: #161b22;
    }
    .dep-icon {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      flex-shrink: 0;
    }
    .dep-item-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .tag {
      background: #21262d;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      color: #8b949e;
    }
    .no-data {
      color: #6e7681;
      font-size: 13px;
      font-style: italic;
    }
    
    /* Controls */
    .controls {
      position: fixed;
      bottom: 20px;
      left: 20px;
      display: flex;
      gap: 8px;
      z-index: 100;
    }
    .ctrl-btn {
      width: 36px;
      height: 36px;
      border: 1px solid #30363d;
      background: #161b22;
      border-radius: 6px;
      color: #c9d1d9;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      transition: all 0.15s;
    }
    .ctrl-btn:hover {
      background: #21262d;
      border-color: #58a6ff;
    }
    
    /* Search */
    .search-container {
      position: fixed;
      top: 70px;
      left: 20px;
      z-index: 100;
    }
    .search-input {
      width: 280px;
      padding: 10px 14px;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      color: #c9d1d9;
      font-size: 13px;
      outline: none;
    }
    .search-input:focus {
      border-color: #58a6ff;
    }
    .search-input::placeholder {
      color: #6e7681;
    }
    .search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      margin-top: 4px;
      max-height: 300px;
      overflow-y: auto;
      display: none;
    }
    .search-results.active {
      display: block;
    }
    .search-result-item {
      padding: 10px 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #21262d;
    }
    .search-result-item:hover {
      background: #21262d;
    }
    .search-result-item:last-child {
      border-bottom: none;
    }
    
    /* Node colors */
    .source-color { background: #1f6feb; }
    .model-color { background: #238636; }
    .seed-color { background: #a371f7; }
    .snapshot-color { background: #f85149; }
    .selected-color { background: #ff694a; }
    
    /* Keyboard shortcuts */
    .shortcuts {
      position: fixed;
      bottom: 20px;
      left: 220px;
      font-size: 11px;
      color: #6e7681;
      display: flex;
      gap: 16px;
    }
    .shortcut {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .key {
      background: #21262d;
      border: 1px solid #30363d;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="logo">
        <svg width="20" height="20" viewBox="0 0 256 256" fill="none">
          <path d="M128 0C57.3 0 0 57.3 0 128s57.3 128 128 128 128-57.3 128-128S198.7 0 128 0z" fill="#FF694A"/>
          <path d="M128 48l64 80-64 80-64-80 64-80z" fill="white"/>
        </svg>
        dbt Cloud Lineage
      </div>
      <div class="breadcrumb">
        ${environmentName} / <span id="current-node-name">${selectedModel.name}</span>
      </div>
      <div class="stats-bar">
        <div class="stat">📦 Models: <span class="stat-value">${modelCount}</span></div>
        <div class="stat">🗄️ Sources: <span class="stat-value">${sourceCount}</span></div>
        <div class="stat">🔗 Edges: <span class="stat-value">${edgeCount}</span></div>
      </div>
    </div>
    <div class="legend">
      <div class="legend-item">
        <div class="legend-icon source-color">🗄️</div>
        Source
      </div>
      <div class="legend-item">
        <div class="legend-icon model-color">📦</div>
        Model
      </div>
      <div class="legend-item">
        <div class="legend-icon seed-color">🌱</div>
        Seed
      </div>
      <div class="legend-item">
        <div class="legend-icon snapshot-color">📸</div>
        Snapshot
      </div>
      <div class="legend-item">
        <div class="legend-icon selected-color">⭐</div>
        Selected
      </div>
    </div>
  </div>
  
  <div class="search-container">
    <input type="text" class="search-input" id="search-input" placeholder="Search models and sources... (⌘K)">
    <div class="search-results" id="search-results"></div>
  </div>
  
  <div id="cy"></div>
  
  <div class="side-panel" id="side-panel">
    <!-- Populated by JS -->
  </div>
  
  <div class="controls">
    <button class="ctrl-btn" onclick="cy.fit(50)" title="Fit to view (F)">⊡</button>
    <button class="ctrl-btn" onclick="cy.zoom(cy.zoom() * 1.2)" title="Zoom in (+)">+</button>
    <button class="ctrl-btn" onclick="cy.zoom(cy.zoom() / 1.2)" title="Zoom out (-)">−</button>
    <button class="ctrl-btn" onclick="centerOnSelected()" title="Center on selected (C)">◎</button>
    <button class="ctrl-btn" onclick="resetView()" title="Reset view (R)">↺</button>
  </div>
  
  <div class="shortcuts">
    <div class="shortcut"><span class="key">Scroll</span> Zoom</div>
    <div class="shortcut"><span class="key">Drag</span> Pan</div>
    <div class="shortcut"><span class="key">Click</span> Select</div>
    <div class="shortcut"><span class="key">⌘K</span> Search</div>
  </div>
  
  <script>
    const nodesData = ${JSON.stringify(nodes)};
    const edgesData = ${JSON.stringify(edges)};
    const initialSelectedId = '${nodeId(selectedModel.uniqueId)}';
    
    // Build lookup maps
    const nodeDataMap = new Map();
    nodesData.forEach(n => nodeDataMap.set(n.data.id, n.data));
    
    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: [...nodesData, ...edgesData],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '10px',
            'font-family': 'Inter, sans-serif',
            'font-weight': '500',
            'color': '#fff',
            'text-outline-color': '#000',
            'text-outline-width': '1px',
            'width': function(ele) { return Math.min(Math.max(ele.data('label').length * 6.5 + 30, 80), 200); },
            'height': '32px',
            'shape': 'round-rectangle',
            'background-color': function(ele) {
              if (ele.data('isSelected')) return '#ff694a';
              const type = ele.data('type');
              if (type === 'source') return '#1f6feb';
              if (type === 'seed') return '#a371f7';
              if (type === 'snapshot') return '#f85149';
              return '#238636';
            },
            'border-width': '0px',
          }
        },
        {
          selector: 'node.selected',
          style: {
            'background-color': '#ff694a',
            'border-width': '3px',
            'border-color': '#fff',
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#30363d',
            'target-arrow-color': '#30363d',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
          }
        },
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#58a6ff',
            'target-arrow-color': '#58a6ff',
            'width': 2.5,
          }
        },
        {
          selector: 'node.dimmed',
          style: {
            'opacity': 0.3,
          }
        },
        {
          selector: 'edge.dimmed',
          style: {
            'opacity': 0.15,
          }
        },
        {
          selector: 'node.path',
          style: {
            'border-width': '2px',
            'border-color': '#58a6ff',
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'LR',
        nodeSep: 40,
        rankSep: 80,
        padding: 50,
      },
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.3,
    });
    
    let selectedNodeId = initialSelectedId;
    
    function getTypeIcon(type) {
      switch(type) {
        case 'source': return '🗄️';
        case 'seed': return '🌱';
        case 'snapshot': return '📸';
        default: return '📦';
      }
    }
    
    function getTypeColor(type) {
      switch(type) {
        case 'source': return 'source-color';
        case 'seed': return 'seed-color';
        case 'snapshot': return 'snapshot-color';
        default: return 'model-color';
      }
    }
    
    function getUpstreamNodes(nodeId) {
      return cy.getElementById(nodeId).incomers('node').map(n => n.data());
    }
    
    function getDownstreamNodes(nodeId) {
      return cy.getElementById(nodeId).outgoers('node').map(n => n.data());
    }
    
    function updateSidePanel(nodeId) {
      const data = nodeDataMap.get(nodeId);
      if (!data) return;
      
      const upstream = getUpstreamNodes(nodeId);
      const downstream = getDownstreamNodes(nodeId);
      
      document.getElementById('current-node-name').textContent = data.label;
      
      const panel = document.getElementById('side-panel');
      panel.innerHTML = \`
        <div class="panel-section">
          <div class="panel-title">Selected Node</div>
          <div class="model-name">\${data.label}</div>
          <div class="model-type">
            <span class="model-type-badge \${data.type}">\${data.type}</span>
            \${data.materialization ? \`<span class="model-type-badge">\${data.materialization}</span>\` : ''}
          </div>
        </div>
        
        \${data.description ? \`
        <div class="panel-section">
          <div class="panel-title">Description</div>
          <div class="description">\${data.description}</div>
        </div>
        \` : ''}
        
        <div class="panel-section">
          <div class="panel-title">Location</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Database</div>
              <div class="info-value">\${data.database || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Schema</div>
              <div class="info-value">\${data.schema || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <div class="panel-section">
          <div class="panel-title">Upstream <span class="count">\${upstream.length}</span></div>
          <div class="dep-list">
            \${upstream.length > 0 ? upstream.map(n => \`
              <div class="dep-item" onclick="selectNode('\${n.id}')">
                <div class="dep-icon \${getTypeColor(n.type)}">\${getTypeIcon(n.type)}</div>
                <span class="dep-item-name">\${n.label}</span>
              </div>
            \`).join('') : '<div class="no-data">No upstream dependencies</div>'}
          </div>
        </div>
        
        <div class="panel-section">
          <div class="panel-title">Downstream <span class="count">\${downstream.length}</span></div>
          <div class="dep-list">
            \${downstream.length > 0 ? downstream.map(n => \`
              <div class="dep-item" onclick="selectNode('\${n.id}')">
                <div class="dep-icon \${getTypeColor(n.type)}">\${getTypeIcon(n.type)}</div>
                <span class="dep-item-name">\${n.label}</span>
              </div>
            \`).join('') : '<div class="no-data">No downstream dependencies</div>'}
          </div>
        </div>
        
        \${data.tags && data.tags.length > 0 ? \`
        <div class="panel-section">
          <div class="panel-title">Tags</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            \${data.tags.map(t => \`<span class="tag">\${t}</span>\`).join('')}
          </div>
        </div>
        \` : ''}
        
        <div class="panel-section">
          <div class="panel-title">Unique ID</div>
          <div class="info-value" style="font-size:11px;word-break:break-all;">\${data.uniqueId}</div>
        </div>
      \`;
    }
    
    function selectNode(nodeId) {
      // Remove previous selection
      cy.nodes().removeClass('selected');
      cy.elements().removeClass('dimmed path');
      
      // Add new selection
      const node = cy.getElementById(nodeId);
      if (node.length > 0) {
        node.addClass('selected');
        selectedNodeId = nodeId;
        
        // Highlight path (all connected nodes)
        const connected = node.predecessors().union(node.successors()).union(node);
        cy.elements().addClass('dimmed');
        connected.removeClass('dimmed');
        connected.edges().removeClass('dimmed').addClass('highlighted');
        node.removeClass('dimmed');
        
        // Center on node
        cy.animate({
          center: { eles: node },
          zoom: Math.min(cy.zoom(), 1.5),
          duration: 300
        });
        
        // Update panel
        updateSidePanel(nodeId);
      }
    }
    
    function centerOnSelected() {
      const node = cy.getElementById(selectedNodeId);
      if (node.length > 0) {
        cy.animate({
          center: { eles: node },
          zoom: 1.5,
          duration: 300
        });
      }
    }
    
    function resetView() {
      cy.elements().removeClass('dimmed path highlighted');
      cy.fit(50);
    }
    
    // Initialize
    cy.ready(function() {
      selectNode(initialSelectedId);
    });
    
    // Click to select node
    cy.on('tap', 'node', function(e) {
      selectNode(e.target.id());
    });
    
    // Click on background to reset dimming
    cy.on('tap', function(e) {
      if (e.target === cy) {
        cy.elements().removeClass('dimmed highlighted');
      }
    });
    
    // Hover to highlight edges
    cy.on('mouseover', 'node', function(e) {
      if (!cy.elements().hasClass('dimmed')) {
        e.target.connectedEdges().addClass('highlighted');
      }
    });
    
    cy.on('mouseout', 'node', function(e) {
      if (!cy.elements().hasClass('dimmed')) {
        e.target.connectedEdges().removeClass('highlighted');
      }
    });
    
    // Search functionality
    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    
    searchInput.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      if (query.length < 2) {
        searchResults.classList.remove('active');
        return;
      }
      
      const matches = nodesData
        .filter(n => n.data.label.toLowerCase().includes(query) || 
                     (n.data.uniqueId && n.data.uniqueId.toLowerCase().includes(query)))
        .slice(0, 10);
      
      if (matches.length > 0) {
        searchResults.innerHTML = matches.map(n => \`
          <div class="search-result-item" onclick="selectNode('\${n.data.id}'); searchInput.value = ''; searchResults.classList.remove('active');">
            <div class="dep-icon \${getTypeColor(n.data.type)}">\${getTypeIcon(n.data.type)}</div>
            <span>\${n.data.label}</span>
          </div>
        \`).join('');
        searchResults.classList.add('active');
      } else {
        searchResults.classList.remove('active');
      }
    });
    
    searchInput.addEventListener('blur', function() {
      setTimeout(() => searchResults.classList.remove('active'), 200);
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        searchInput.focus();
      } else if (e.key === 'f' && !e.metaKey && !e.ctrlKey) {
        if (document.activeElement !== searchInput) {
          cy.fit(50);
        }
      } else if (e.key === 'c' && !e.metaKey && !e.ctrlKey) {
        if (document.activeElement !== searchInput) {
          centerOnSelected();
        }
      } else if (e.key === 'r' && !e.metaKey && !e.ctrlKey) {
        if (document.activeElement !== searchInput) {
          resetView();
        }
      } else if (e.key === 'Escape') {
        searchInput.blur();
        searchResults.classList.remove('active');
        resetView();
      }
    });
  </script>
</body>
</html>`;

  // Write to temp file and open
  const tempDir = os.tmpdir();
  const fileName = `dbt-cloud-lineage-${nodeId(selectedModel.name)}-${Date.now()}.html`;
  const filePath = path.join(tempDir, fileName);

  fs.writeFileSync(filePath, html);
  await open(`file://${filePath}`);
}

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
              <Action
                title="Generate Mermaid Diagram"
                icon={Icon.Code}
                shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                onAction={async () => {
                  await showToast(Toast.Style.Animated, "Generating diagram...");
                  await openInteractiveLineageDiagram(node as ModelNode, fullModel, "dbt Cloud");
                  await showToast(Toast.Style.Success, "Diagram opened in browser");
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

// Projects list within a deployment type for Lineage
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
                      title="Explore Lineage"
                      icon={Icon.Link}
                      target={
                        <LineageList
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
                  title="Explore Lineage"
                  icon={Icon.Link}
                  target={
                    <LineageList
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
