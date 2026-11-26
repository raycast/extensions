// Interactive lineage diagram as a standalone HTML page (Cytoscape + dagre from pinned CDNs),
// adapted from the dbtcloud extension's lineage_diagram.ts, including its safe JSON/HTML escaping.
// Pure: returns the HTML string; the view writes it to a temp file and opens it.

import { KIND_LABEL, LineageEdge, SignalKind } from "./lineage";

export interface DiagramNode {
  id: string; // dag id
  role: "root" | "up" | "down" | "other";
  failed?: boolean;
  paused?: boolean;
  url: string; // Airflow grid URL
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

// Monokai Pro palette
const KIND_COLOR: Record<SignalKind, string> = {
  success: "#a9dc76",
  done: "#78dce8",
  failed: "#ff6188",
  complete: "#ffd866",
  data: "#ab9df2",
};
const ROLE_COLOR = { root: "#fc9867", up: "#78dce8", down: "#a9dc76", other: "#5b595c" };

export function lineageHtml(opts: {
  envId: string;
  root: string;
  nodes: DiagramNode[];
  edges: LineageEdge[];
  generatedAt: string;
}): string {
  const { envId, root, nodes, edges } = opts;
  const elements = [
    ...nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.id,
        role: n.role,
        color: ROLE_COLOR[n.role],
        border: n.failed ? "#ff6188" : n.role === "root" ? "#fcfcfa" : "#403e41",
        failed: !!n.failed,
        paused: !!n.paused,
        url: n.url,
      },
    })),
    ...edges.map((e, i) => ({
      data: {
        id: `e${i}`,
        source: e.from,
        target: e.to,
        kind: e.kind,
        color: KIND_COLOR[e.kind],
        dataset: e.datasetUri,
        task: e.producerTask ?? "",
      },
    })),
  ];
  const kinds = Array.from(new Set(edges.map((e) => e.kind)));
  const legend = kinds
    .map(
      (k) =>
        `<label class="kind"><input type="checkbox" data-kind="${k}" checked><span style="background:${
          KIND_COLOR[k]
        }"></span>${escapeHtml(KIND_LABEL[k])}</label>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lineage: ${escapeHtml(root)} | ${escapeHtml(envId)}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js" integrity="sha384-J7Q85oZE4GJ/e7+n2aOQsLXfDwwfnA8S2nZAL5BpFsfpCF84zQD7LroZ/dMnLgex" crossorigin="anonymous"></script>
<script src="https://unpkg.com/dagre@0.8.5/dist/dagre.min.js" integrity="sha384-2IH3T69EIKYC4c+RXZifZRvaH5SRUdacJW7j6HtE5rQbvLhKKdawxq6vpIzJ7j9M" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/cytoscape-dagre@2.5.0/cytoscape-dagre.min.js" integrity="sha384-EHCdyFVbhtbpgI+4x7ETlZUvJwOkxJublmhTpH114NSk3fqfiUgcLl6pQm8JQwg9" crossorigin="anonymous"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  :root { --bg:#2d2a2e; --panel:#221f22; --fg:#fcfcfa; --mute:#939293; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:14px Inter, system-ui, sans-serif; display:flex; height:100vh; }
  #cy { flex:1; }
  aside { width:340px; background:var(--panel); padding:16px; overflow:auto; border-left:1px solid #403e41; }
  h1 { font:600 15px 'JetBrains Mono', monospace; margin:0 0 4px; word-break:break-all; }
  h2 { font:600 12px Inter; color:var(--mute); text-transform:uppercase; letter-spacing:.06em; margin:18px 0 6px; }
  .sub { color:var(--mute); font-size:12px; }
  .item { font:12px 'JetBrains Mono', monospace; padding:4px 6px; border-radius:4px; cursor:pointer; word-break:break-all; }
  .item:hover { background:#403e41; }
  .item small { color:var(--mute); display:block; }
  a { color:#78dce8; }
  #bar { position:absolute; top:12px; left:12px; display:flex; gap:8px; align-items:center; flex-wrap:wrap; max-width:calc(100% - 380px); }
  #bar input[type=search] { background:var(--panel); color:var(--fg); border:1px solid #403e41; border-radius:6px; padding:6px 8px; width:220px; }
  button { background:var(--panel); color:var(--fg); border:1px solid #403e41; border-radius:6px; padding:6px 10px; cursor:pointer; }
  .kind { display:flex; gap:4px; align-items:center; background:var(--panel); padding:4px 8px; border-radius:6px; font-size:12px; }
  .kind span { width:14px; height:3px; display:inline-block; }
</style>
</head>
<body>
<div id="cy"></div>
<div id="bar">
  <input type="search" id="q" placeholder="Find DAG…">
  <button id="fit">Fit</button><button id="reset">Reset</button>
  ${legend}
</div>
<aside id="side"></aside>
<script>
const ELEMENTS = ${safeJson(elements)};
const ROOT = ${safeJson(root)};
const META = ${safeJson({ env: envId, generatedAt: opts.generatedAt, nodes: nodes.length, edges: edges.length })};
cytoscape.use(cytoscapeDagre);
const cy = cytoscape({
  container: document.getElementById('cy'),
  elements: ELEMENTS,
  minZoom: 0.1, maxZoom: 3,
  style: [
    { selector: 'node', style: {
      'label': 'data(label)', 'shape': 'round-rectangle', 'background-color': 'data(color)',
      'border-width': 2, 'border-color': 'data(border)', 'color': '#2d2a2e',
      'font-family': 'JetBrains Mono, monospace', 'font-size': 10, 'text-valign': 'center', 'text-halign': 'center',
      'width': 'label', 'height': 26, 'padding': '8px', 'text-wrap': 'none' } },
    { selector: 'node[?paused]', style: { 'opacity': 0.6, 'border-style': 'dashed' } },
    { selector: 'edge', style: {
      'width': 2, 'line-color': 'data(color)', 'target-arrow-color': 'data(color)',
      'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'arrow-scale': 0.9 } },
    { selector: '.dim', style: { 'opacity': 0.12 } },
    { selector: '.hidden', style: { 'display': 'none' } },
    { selector: 'node:selected', style: { 'border-color': '#ffd866', 'border-width': 4 } },
  ],
  layout: { name: 'dagre', rankDir: 'LR', nodeSep: 18, rankSep: 90, padding: 40 },
});
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function list(title, edges, dir) {
  if (!edges.length) return '<h2>' + title + ' (0)</h2>';
  return '<h2>' + title + ' (' + edges.length + ')</h2>' + edges.map((e) => {
    const other = dir === 'up' ? e.source().id() : e.target().id();
    return '<div class="item" data-id="' + esc(other) + '">' + esc(other) +
      '<small>' + esc(e.data('kind')) + ' · ' + esc(e.data('dataset')) + '</small></div>';
  }).join('');
}
let firstSelect = true;
function select(id) {
  const n = cy.getElementById(id);
  if (!n.length) return;
  cy.elements().removeClass('dim');
  const keep = n.predecessors().union(n.successors()).union(n);
  cy.elements().not(keep).addClass('dim');
  cy.$(':selected').unselect(); n.select();
  if (firstSelect) { firstSelect = false; cy.fit(keep, 80); } else { cy.animate({ center: { eles: n }, duration: 250 }); }
  const ins = n.incomers('edge').filter((e) => !e.hasClass('hidden'));
  const outs = n.outgoers('edge').filter((e) => !e.hasClass('hidden'));
  document.getElementById('side').innerHTML =
    '<h1>' + esc(id) + '</h1><div class="sub">' + esc(META.env) + (n.data('failed') ? ' · <b style="color:#ff6188">recent failure</b>' : '') +
    (n.data('paused') ? ' · paused' : '') + '</div>' +
    '<p><a href="' + esc(n.data('url')) + '" target="_blank">Open in Airflow ↗</a></p>' +
    '<div class="sub">Full upstream ' + n.predecessors('node').length + ' · full downstream ' + n.successors('node').length + '</div>' +
    list('Waits on', ins, 'up') + list('Triggers', outs, 'down');
  document.querySelectorAll('.item').forEach((el) => el.onclick = () => select(el.dataset.id));
}
cy.on('tap', 'node', (e) => select(e.target.id()));
cy.on('tap', (e) => { if (e.target === cy) { cy.elements().removeClass('dim'); } });
document.getElementById('fit').onclick = () => cy.fit(undefined, 40);
document.getElementById('reset').onclick = () => { cy.elements().removeClass('dim'); select(ROOT); cy.fit(undefined, 40); };
document.getElementById('q').oninput = (e) => {
  const q = e.target.value.toLowerCase(); if (q.length < 2) return;
  const hit = cy.nodes().filter((n) => n.id().toLowerCase().includes(q))[0]; if (hit) select(hit.id());
};
document.querySelectorAll('input[data-kind]').forEach((cb) => cb.onchange = () => {
  cy.edges('[kind = "' + cb.dataset.kind + '"]').toggleClass('hidden', !cb.checked);
  select(cy.$(':selected').id() || ROOT);
});
select(ROOT);
document.getElementById('side').insertAdjacentHTML('beforeend',
  '<h2>Graph</h2><div class="sub">' + META.nodes + ' DAGs · ' + META.edges + ' edges · generated ' + esc(META.generatedAt) + '</div>');
</script>
</body>
</html>`;
}
