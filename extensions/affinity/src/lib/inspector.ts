/** Fixed, read-only SDK script. No document writes, selection changes, files, networks, or AI calls. */
export const INSPECT_SCRIPT = `(() => {
  const { Document } = require('/document.js');
  const current = Document.current;
  const documents = Document.all.map(doc => {
    const layers = [];
    let layersLimited = false;
    const visit = (node, depth) => {
      if (layers.length >= 5000 || depth > 100) { layersLimited = true; return; }
      layers.push({ name: String(node.userDescription || node.description || node.defaultDescriptionForDisplay || 'Layer'),
        depth: depth, visible: !!node.isVisible, locked: !!node.isLocked });
      node.children.toArray().forEach(child => visit(child, depth + 1));
    };
    doc.rootNode.children.toArray().forEach(node => visit(node, 0));
    return { id: String(doc.sessionUuid), title: String(doc.title), path: String(doc.path || ''),
      current: !!current && doc.isSameObject(current), width: doc.widthPixels, height: doc.heightPixels,
      dpi: doc.dpi, pages: doc.pageCount, spreads: doc.spreadCount, dirty: !!doc.isDirty,
      selectionCount: doc.selection.nodes.length, layers: layers, layersLimited: layersLimited };
  });
  return JSON.stringify({ documents: documents });
})()`;

export interface LayerInfo {
  name: string;
  depth: number;
  visible: boolean;
  locked: boolean;
}

export interface DocumentInfo {
  id: string;
  title: string;
  path: string;
  current: boolean;
  width: number;
  height: number;
  dpi: number;
  pages: number;
  spreads: number;
  dirty: boolean;
  selectionCount: number;
  layers: LayerInfo[];
  layersLimited: boolean;
}

export interface Inspection {
  documents: DocumentInfo[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findInspection(value: unknown, depth = 0): unknown {
  if (depth > 8) return undefined;
  if (typeof value === "string") {
    try {
      return findInspection(JSON.parse(value), depth + 1);
    } catch {
      return undefined;
    }
  }
  if (isRecord(value)) {
    if (Array.isArray(value.documents)) return value;
    // Affinity tool output versions can wrap a script result as JSON, text, or structured content.
    for (const key of ["structuredContent", "result", "output", "data", "text", "content"]) {
      const candidate = findInspection(value[key], depth + 1);
      if (candidate) return candidate;
    }
  } else if (Array.isArray(value)) {
    for (const entry of value) {
      const candidate = findInspection(entry, depth + 1);
      if (candidate) return candidate;
    }
  }
  return undefined;
}

export function parseInspection(result: unknown): Inspection {
  const candidate = findInspection(result);
  if (!isRecord(candidate) || !Array.isArray(candidate.documents)) {
    throw new Error(
      "Affinity did not return a document inventory. This MCP/SDK version needs compatibility verification.",
    );
  }
  const documents: DocumentInfo[] = candidate.documents.map((document: unknown) => {
    if (!isRecord(document)) throw new Error("Affinity returned an invalid document record.");
    for (const key of ["id", "title", "path"]) {
      if (typeof document[key] !== "string") throw new Error(`Invalid Affinity document field: ${key}.`);
    }
    for (const key of ["width", "height", "dpi", "pages", "spreads", "selectionCount"]) {
      if (typeof document[key] !== "number" || !Number.isFinite(document[key])) {
        throw new Error(`Invalid Affinity document field: ${key}.`);
      }
    }
    for (const key of ["current", "dirty", "layersLimited"]) {
      if (typeof document[key] !== "boolean") throw new Error(`Invalid Affinity document field: ${key}.`);
    }
    if (!Array.isArray(document.layers) || document.layers.length > 5000) {
      throw new Error("Affinity returned an invalid or oversized layer inventory.");
    }
    for (const layer of document.layers) {
      if (
        !isRecord(layer) ||
        typeof layer.name !== "string" ||
        typeof layer.depth !== "number" ||
        !Number.isInteger(layer.depth) ||
        layer.depth < 0 ||
        layer.depth > 100 ||
        typeof layer.visible !== "boolean" ||
        typeof layer.locked !== "boolean"
      ) {
        throw new Error("Affinity returned an invalid layer record.");
      }
    }
    return document as unknown as DocumentInfo;
  });
  return { documents };
}

export interface ToolDescription {
  name: string;
  inputSchema: { properties?: Record<string, unknown>; required?: string[] };
}

export function singleToolArgument(tool: ToolDescription, names: string[], value: string): Record<string, string> {
  const argument = names.find((name) => name in (tool.inputSchema.properties ?? {}));
  if (!argument) throw new Error(`Affinity tool ${tool.name} has an unsupported input schema.`);
  const required = tool.inputSchema.required ?? [];
  if (required.some((name) => name !== argument)) {
    throw new Error(
      `Affinity tool ${tool.name} requires additional arguments. Compatibility verification is required.`,
    );
  }
  return { [argument]: value };
}

export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()<>#+.!|~-]/g, "\\$&");
}
