import { DiagramRequest, ResolvedEngine } from "./types";

const BEAUTIFUL_SUPPORTED_PREFIXES = [
  "graph",
  "flowchart",
  "stateDiagram",
  "stateDiagram-v2",
  "sequenceDiagram",
  "classDiagram",
  "erDiagram",
  "xychart-beta",
];

function firstMermaidLine(code: string): string {
  return (
    code
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? ""
  );
}

export function supportsBeautifulMermaidSyntax(code: string): boolean {
  const firstLine = firstMermaidLine(code);
  return BEAUTIFUL_SUPPORTED_PREFIXES.some((prefix) => firstLine.startsWith(prefix));
}

export function resolveRenderer(request: Pick<DiagramRequest, "code" | "format" | "requestedEngine">): ResolvedEngine {
  if (request.requestedEngine === "compatible") {
    return "mmdc";
  }

  if (request.requestedEngine === "beautiful") {
    return "beautiful";
  }

  if (request.format === "svg" && supportsBeautifulMermaidSyntax(request.code)) {
    return "beautiful";
  }

  return "mmdc";
}
