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

// Phase 2's reviewed families, not a claim of complete syntax coverage.
const ONDINE_AUTO_HEADERS = new Set([
  ...BEAUTIFUL_SUPPORTED_PREFIXES,
  "mindmap",
  "timeline",
  "journey",
  "gantt",
  "pie",
  "gitGraph",
  "quadrantChart",
  "sankey-beta",
  "block-beta",
  "packet-beta",
  "kanban",
  "architecture-beta",
  "requirementDiagram",
  "C4Context",
  "radar-beta",
  "treemap-beta",
  "info",
]);

function hasEmbeddedConfiguration(source: string): boolean {
  // Bypass all directive/frontmatter configuration rather than partially parsing
  // YAML/JSON and silently dropping settings Ondine may not honor.
  return /^\s*%%\s*\{/m.test(source) || /^\s*---(?:\s|$)/.test(source);
}

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

export function getOndineAutoFamily(code: string): string | undefined {
  const declaration = code
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0 && !line.startsWith("%%"));
  const header = declaration?.match(/^[\w-]+(?=\s|$)/)?.[0];
  return header && ONDINE_AUTO_HEADERS.has(header) ? header : undefined;
}

export function resolveRenderer(
  request: Pick<DiagramRequest, "code" | "format" | "requestedEngine" | "useOndineInAuto" | "originalSource">,
): ResolvedEngine {
  if (request.requestedEngine === "ondine") return "ondine";

  if (request.requestedEngine === "compatible") {
    return "mmdc";
  }

  if (request.requestedEngine === "beautiful") {
    return "beautiful";
  }

  if (request.format === "svg" && supportsBeautifulMermaidSyntax(request.code)) {
    return "beautiful";
  }

  if (
    (request.format === "svg" || !BEAUTIFUL_SUPPORTED_PREFIXES.includes(getOndineAutoFamily(request.code) ?? "")) &&
    request.useOndineInAuto === true &&
    !hasEmbeddedConfiguration(request.originalSource ?? request.code) &&
    !hasEmbeddedConfiguration(request.code)
  ) {
    if (getOndineAutoFamily(request.code)) return "ondine";
  }

  return "mmdc";
}
