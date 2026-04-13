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

export function detectDiagramType(code: string): string {
  const trimmed = code.trim();
  if (trimmed.startsWith("graph") || trimmed.startsWith("flowchart")) return "Flowchart";
  if (trimmed.includes("sequenceDiagram")) return "Sequence";
  if (trimmed.includes("classDiagram")) return "Class";
  if (trimmed.includes("stateDiagram")) return "State";
  if (trimmed.includes("erDiagram")) return "ER";
  if (trimmed.includes("gantt")) return "Gantt";
  if (trimmed.includes("pie")) return "Pie";
  if (trimmed.includes("journey")) return "Journey";
  if (trimmed.includes("gitGraph")) return "Git";
  if (trimmed.includes("mindmap")) return "Mindmap";
  if (trimmed.includes("timeline")) return "Timeline";
  if (trimmed.includes("quadrantChart")) return "Quadrant";
  return "Diagram";
}
