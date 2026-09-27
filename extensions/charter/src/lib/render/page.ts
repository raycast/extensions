import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { ChartSource } from "./source";

/** The ECharts canvas needs a size up front; Mermaid sizes its own SVG up to this width. */
const CANVAS = { width: 900, height: 560 };
export const MAX_WIDTH = 1200;

const baseStyle = `
  html, body { margin: 0; background: transparent; }
  #stage { display: inline-block; padding: 8px;
    font-family: -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif; }
`;

/** `text` is the diagram already JSON-encoded, so it drops straight into the script. */
function mermaidPage(text: string, dark: boolean, script: string): string {
  const config = JSON.stringify({
    startOnLoad: false,
    theme: dark ? "dark" : "default",
    securityLevel: "loose",
    fontFamily: "-apple-system, Helvetica Neue, Helvetica, Arial, sans-serif",
  });
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyle}
  #stage { width: ${MAX_WIDTH}px; }
  #stage svg { max-width: 100%; }</style></head>
<body><div id="stage"></div>
<script src="${script}"></script>
<script>
  window.status = "pending";
  mermaid.initialize(${config});
  mermaid.render("chart", ${text}).then(({ svg }) => {
    document.getElementById("stage").innerHTML = svg;
    window.status = "done";
  }).catch((error) => { window.status = "error: " + (error && error.message ? error.message : String(error)); });
</script></body></html>`;
}

function echartsPage(text: string, dark: boolean, script: string, maps: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${baseStyle}
  #chart { width: ${CANVAS.width}px; height: ${CANVAS.height}px; }</style></head>
<body><div id="stage"><div id="chart"></div></div>
<script src="${script}"></script>
<script src="${maps}"></script>
<script>
  window.status = "pending";
  try {
    for (const [name, geo] of Object.entries(window.CHARTER_MAPS || {})) echarts.registerMap(name, geo);
    // Treemap labels fade in on their own clock, so the durations go to zero as well as the switch.
    const defaults = { backgroundColor: "transparent", animation: false, animationDuration: 0, animationDurationUpdate: 0 };
    const option = Object.assign(defaults, ${text});
    const chart = echarts.init(document.getElementById("chart"), ${dark ? '"dark"' : "null"}, { renderer: "canvas" });
    chart.setOption(option);
    window.status = "done";
  } catch (error) { window.status = "error: " + (error && error.message ? error.message : String(error)); }
</script></body></html>`;
}

/** A closing tag inside the source would end the inline script; JSON accepts the escaped slash. */
function inlineSafe(json: string): string {
  return json.replace(/<\//g, "<\\/");
}

/** The page the browser loads: the vendored library plus the source, signalling through window.status. */
export function buildPage(source: ChartSource, dark: boolean, vendorDir: string): string {
  const script = pathToFileURL(join(vendorDir, `${source.kind}.min.js`)).href;
  if (source.kind === "mermaid") return mermaidPage(inlineSafe(JSON.stringify(source.text)), dark, script);
  return echartsPage(inlineSafe(source.text), dark, script, pathToFileURL(join(vendorDir, "maps.js")).href);
}

/** The element to capture: Mermaid's SVG at its natural size, or the ECharts canvas. */
export function captureSelector(source: ChartSource): string {
  return source.kind === "mermaid" ? "#stage svg" : "#chart";
}
