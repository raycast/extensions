import { open, showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { fetchModelsWithLineage, fetchSources } from "./api";
import { ModelNode, SourceNode } from "./types";

// Generate dbt Cloud-style interactive lineage diagram using Cytoscape.js with FULL project DAG
export async function openDbtCloudLineageDiagram(
  selectedUniqueId: string,
  selectedLabel: string,
  allModels: ModelNode[],
  allSources: SourceNode[],
  environmentName: string
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
      isSelected: n.uniqueId === selectedUniqueId,
    },
  }));

  // Stats for the header
  const modelCount = allModels.length;
  const sourceCount = allSources.length;
  const edgeCount = edges.length;

  const html = generateLineageHtml(
    selectedLabel,
    environmentName,
    modelCount,
    sourceCount,
    edgeCount,
    nodes,
    edges,
    nodeId(selectedUniqueId)
  );

  // Write to temp file and open
  const tempDir = os.tmpdir();
  const fileName = `dbt-cloud-lineage-${nodeId(selectedLabel)}-${Date.now()}.html`;
  const filePath = path.join(tempDir, fileName);

  fs.writeFileSync(filePath, html);
  await open(`file://${filePath}`);
}

// Helper to open lineage diagram for a given environment, optionally selecting a specific node
export async function openEnvironmentLineageDiagram(
  environmentId: number,
  environmentName: string,
  selectedUniqueId?: string,
  selectedLabel?: string
): Promise<void> {
  await showToast(Toast.Style.Animated, "Loading project lineage...");

  const [allModels, allSources] = await Promise.all([
    fetchModelsWithLineage(environmentId),
    fetchSources(environmentId),
  ]);

  if (allModels.length === 0 && allSources.length === 0) {
    await showToast(Toast.Style.Failure, "No models or sources found");
    return;
  }

  // If no specific node selected, use the first model
  const targetUniqueId = selectedUniqueId || allModels[0]?.uniqueId || allSources[0]?.uniqueId;
  const targetLabel = selectedLabel || allModels[0]?.name || `${allSources[0]?.sourceName}.${allSources[0]?.name}`;

  await showToast(Toast.Style.Animated, "Generating lineage diagram...");
  await openDbtCloudLineageDiagram(targetUniqueId, targetLabel, allModels, allSources, environmentName);
  await showToast(Toast.Style.Success, "Lineage opened in browser");
}

const escapeHtml = (value: string): string =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// JSON.stringify does not escape "<", so raw output can terminate the enclosing <script> block.
const safeJson = (value: unknown): string =>
  JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");

function generateLineageHtml(
  selectedLabel: string,
  environmentName: string,
  modelCount: number,
  sourceCount: number,
  edgeCount: number,
  nodes: any[],
  edges: any[],
  initialSelectedId: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lineage: ${escapeHtml(selectedLabel)} | ${escapeHtml(environmentName)}</title>
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
    #cy {
      position: absolute;
      top: 56px;
      left: 0;
      right: 340px;
      bottom: 0;
      background: #0d1117;
    }
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
    .panel-section { margin-bottom: 24px; }
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
    .info-grid { display: grid; gap: 12px; }
    .info-item { display: flex; flex-direction: column; gap: 4px; }
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
    .search-input:focus { border-color: #58a6ff; }
    .search-input::placeholder { color: #6e7681; }
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
    .search-results.active { display: block; }
    .search-result-item {
      padding: 10px 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      border-bottom: 1px solid #21262d;
    }
    .search-result-item:hover { background: #21262d; }
    .search-result-item:last-child { border-bottom: none; }
    .source-color { background: #1f6feb; }
    .model-color { background: #238636; }
    .seed-color { background: #a371f7; }
    .snapshot-color { background: #f85149; }
    .selected-color { background: #ff694a; }
    .shortcuts {
      position: fixed;
      bottom: 20px;
      left: 220px;
      font-size: 11px;
      color: #6e7681;
      display: flex;
      gap: 16px;
    }
    .shortcut { display: flex; align-items: center; gap: 4px; }
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
        ${escapeHtml(environmentName)} / <span id="current-node-name">${escapeHtml(selectedLabel)}</span>
      </div>
      <div class="stats-bar">
        <div class="stat">📦 Models: <span class="stat-value">${modelCount}</span></div>
        <div class="stat">🗄️ Sources: <span class="stat-value">${sourceCount}</span></div>
        <div class="stat">🔗 Edges: <span class="stat-value">${edgeCount}</span></div>
      </div>
    </div>
    <div class="legend">
      <div class="legend-item"><div class="legend-icon source-color">🗄️</div>Source</div>
      <div class="legend-item"><div class="legend-icon model-color">📦</div>Model</div>
      <div class="legend-item"><div class="legend-icon seed-color">🌱</div>Seed</div>
      <div class="legend-item"><div class="legend-icon snapshot-color">📸</div>Snapshot</div>
      <div class="legend-item"><div class="legend-icon selected-color">⭐</div>Selected</div>
    </div>
  </div>
  <div class="search-container">
    <input type="text" class="search-input" id="search-input" placeholder="Search models and sources... (⌘K)">
    <div class="search-results" id="search-results"></div>
  </div>
  <div id="cy"></div>
  <div class="side-panel" id="side-panel"></div>
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
    const nodesData = ${safeJson(nodes)};
    const edgesData = ${safeJson(edges)};
    const initialSelectedId = ${safeJson(initialSelectedId)};
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
        { selector: 'node.selected', style: { 'background-color': '#ff694a', 'border-width': '3px', 'border-color': '#fff' } },
        { selector: 'edge', style: { 'width': 1.5, 'line-color': '#30363d', 'target-arrow-color': '#30363d', 'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'arrow-scale': 0.8 } },
        { selector: 'edge.highlighted', style: { 'line-color': '#58a6ff', 'target-arrow-color': '#58a6ff', 'width': 2.5 } },
        { selector: 'node.dimmed', style: { 'opacity': 0.3 } },
        { selector: 'edge.dimmed', style: { 'opacity': 0.15 } },
        { selector: 'node.path', style: { 'border-width': '2px', 'border-color': '#58a6ff' } }
      ],
      layout: { name: 'dagre', rankDir: 'LR', nodeSep: 40, rankSep: 80, padding: 50 },
      minZoom: 0.1,
      maxZoom: 4,
      wheelSensitivity: 0.3,
    });

    let selectedNodeId = initialSelectedId;
    function getTypeIcon(type) { return { source: '🗄️', seed: '🌱', snapshot: '📸' }[type] || '📦'; }
    function getTypeColor(type) { return { source: 'source-color', seed: 'seed-color', snapshot: 'snapshot-color' }[type] || 'model-color'; }
    function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
    function getUpstreamNodes(nodeId) { return cy.getElementById(nodeId).incomers('node').map(n => n.data()); }
    function getDownstreamNodes(nodeId) { return cy.getElementById(nodeId).outgoers('node').map(n => n.data()); }

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
          <div class="model-name">\${esc(data.label)}</div>
          <div class="model-type">
            <span class="model-type-badge \${esc(data.type)}">\${esc(data.type)}</span>
            \${data.materialization ? \`<span class="model-type-badge">\${esc(data.materialization)}</span>\` : ''}
          </div>
        </div>
        \${data.description ? \`<div class="panel-section"><div class="panel-title">Description</div><div class="description">\${esc(data.description)}</div></div>\` : ''}
        <div class="panel-section">
          <div class="panel-title">Location</div>
          <div class="info-grid">
            <div class="info-item"><div class="info-label">Database</div><div class="info-value">\${esc(data.database || 'N/A')}</div></div>
            <div class="info-item"><div class="info-label">Schema</div><div class="info-value">\${esc(data.schema || 'N/A')}</div></div>
          </div>
        </div>
        <div class="panel-section">
          <div class="panel-title">Upstream <span class="count">\${upstream.length}</span></div>
          <div class="dep-list">
            \${upstream.length > 0 ? upstream.map(n => \`<div class="dep-item" onclick="selectNode('\${esc(n.id)}')"><div class="dep-icon \${getTypeColor(n.type)}">\${getTypeIcon(n.type)}</div><span class="dep-item-name">\${esc(n.label)}</span></div>\`).join('') : '<div class="no-data">No upstream dependencies</div>'}
          </div>
        </div>
        <div class="panel-section">
          <div class="panel-title">Downstream <span class="count">\${downstream.length}</span></div>
          <div class="dep-list">
            \${downstream.length > 0 ? downstream.map(n => \`<div class="dep-item" onclick="selectNode('\${esc(n.id)}')"><div class="dep-icon \${getTypeColor(n.type)}">\${getTypeIcon(n.type)}</div><span class="dep-item-name">\${esc(n.label)}</span></div>\`).join('') : '<div class="no-data">No downstream dependencies</div>'}
          </div>
        </div>
        \${data.tags && data.tags.length > 0 ? \`<div class="panel-section"><div class="panel-title">Tags</div><div style="display:flex;flex-wrap:wrap;gap:6px;">\${data.tags.map(t => \`<span class="tag">\${esc(t)}</span>\`).join('')}</div></div>\` : ''}
        <div class="panel-section"><div class="panel-title">Unique ID</div><div class="info-value" style="font-size:11px;word-break:break-all;">\${esc(data.uniqueId)}</div></div>
      \`;
    }

    function selectNode(nodeId) {
      cy.nodes().removeClass('selected');
      cy.elements().removeClass('dimmed path');
      const node = cy.getElementById(nodeId);
      if (node.length > 0) {
        node.addClass('selected');
        selectedNodeId = nodeId;
        const connected = node.predecessors().union(node.successors()).union(node);
        cy.elements().addClass('dimmed');
        connected.removeClass('dimmed');
        connected.edges().removeClass('dimmed').addClass('highlighted');
        node.removeClass('dimmed');
        cy.animate({ center: { eles: node }, zoom: Math.min(cy.zoom(), 1.5), duration: 300 });
        updateSidePanel(nodeId);
      }
    }

    function centerOnSelected() {
      const node = cy.getElementById(selectedNodeId);
      if (node.length > 0) cy.animate({ center: { eles: node }, zoom: 1.5, duration: 300 });
    }

    function resetView() {
      cy.elements().removeClass('dimmed path highlighted');
      cy.fit(50);
    }

    cy.ready(function() { selectNode(initialSelectedId); });
    cy.on('tap', 'node', function(e) { selectNode(e.target.id()); });
    cy.on('tap', function(e) { if (e.target === cy) cy.elements().removeClass('dimmed highlighted'); });
    cy.on('mouseover', 'node', function(e) { if (!cy.elements().hasClass('dimmed')) e.target.connectedEdges().addClass('highlighted'); });
    cy.on('mouseout', 'node', function(e) { if (!cy.elements().hasClass('dimmed')) e.target.connectedEdges().removeClass('highlighted'); });

    const searchInput = document.getElementById('search-input');
    const searchResults = document.getElementById('search-results');
    searchInput.addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      if (query.length < 2) { searchResults.classList.remove('active'); return; }
      const matches = nodesData.filter(n => n.data.label.toLowerCase().includes(query) || (n.data.uniqueId && n.data.uniqueId.toLowerCase().includes(query))).slice(0, 10);
      if (matches.length > 0) {
        searchResults.innerHTML = matches.map(n => \`<div class="search-result-item" onclick="selectNode('\${esc(n.data.id)}'); searchInput.value = ''; searchResults.classList.remove('active');"><div class="dep-icon \${getTypeColor(n.data.type)}">\${getTypeIcon(n.data.type)}</div><span>\${esc(n.data.label)}</span></div>\`).join('');
        searchResults.classList.add('active');
      } else { searchResults.classList.remove('active'); }
    });
    searchInput.addEventListener('blur', function() { setTimeout(() => searchResults.classList.remove('active'), 200); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); searchInput.focus(); }
      else if (e.key === 'f' && !e.metaKey && !e.ctrlKey && document.activeElement !== searchInput) { cy.fit(50); }
      else if (e.key === 'c' && !e.metaKey && !e.ctrlKey && document.activeElement !== searchInput) { centerOnSelected(); }
      else if (e.key === 'r' && !e.metaKey && !e.ctrlKey && document.activeElement !== searchInput) { resetView(); }
      else if (e.key === 'Escape') { searchInput.blur(); searchResults.classList.remove('active'); resetView(); }
    });
  </script>
</body>
</html>`;
}
