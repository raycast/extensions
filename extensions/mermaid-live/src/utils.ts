import pako from "pako";

export interface HistoryItem {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  lastAccessed: string;
  isPinned: boolean;
}

export function encodeMermaid(mermaidCode: string): string {
  const graphObject = {
    code: mermaidCode,
    mermaid: JSON.stringify({ theme: "default" }),
  };
  const jsonString = JSON.stringify(graphObject);
  const compressed = pako.deflate(jsonString);
  const base64 = Buffer.from(compressed).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function matchesKeyword(trimmed: string, kw: string): boolean {
  return (
    trimmed === kw ||
    trimmed.startsWith(kw + " ") ||
    trimmed.startsWith(kw + "\n") ||
    trimmed.includes(`\n${kw} `) ||
    trimmed.includes(`\n${kw}\n`)
  );
}

export function detectDiagramType(code: string): string {
  const trimmed = code.trim();
  if (trimmed.startsWith("graph ") || trimmed.startsWith("flowchart ")) return "Flowchart";
  if (matchesKeyword(trimmed, "sequenceDiagram")) return "Sequence";
  if (matchesKeyword(trimmed, "classDiagram-v2")) return "Class (v2)";
  if (matchesKeyword(trimmed, "classDiagram")) return "Class";
  if (matchesKeyword(trimmed, "stateDiagram-v2")) return "State (v2)";
  if (matchesKeyword(trimmed, "stateDiagram")) return "State";
  if (matchesKeyword(trimmed, "erDiagram")) return "ER";
  if (matchesKeyword(trimmed, "gantt")) return "Gantt";
  if (matchesKeyword(trimmed, "pie")) return "Pie";
  if (matchesKeyword(trimmed, "journey")) return "Journey";
  if (matchesKeyword(trimmed, "gitGraph")) return "Git";
  if (matchesKeyword(trimmed, "mindmap")) return "Mindmap";
  if (matchesKeyword(trimmed, "timeline")) return "Timeline";
  if (matchesKeyword(trimmed, "quadrantChart")) return "Quadrant";
  return "Diagram";
}
