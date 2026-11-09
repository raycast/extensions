/** A page in the title list, and a search hit. The server sends one shape for both. */
export type Hit = {
  path: string;
  title: string;
  nodeType?: string | null;
  icon?: string | null;
  summary?: string | null;
  score?: number;
};

const NOT_TOOLS = ["shelf/index", "shelf/customize", "shelf/config_file"];

/** The kind shown beside a page's name: its node type, or "Shelf tool". The app says the same (`pageKind`). */
export function pageKind(hit: Hit): string | undefined {
  if (hit.nodeType) return hit.nodeType;
  return hit.path.startsWith("shelf/") && !NOT_TOOLS.includes(hit.path) ? "Shelf tool" : undefined;
}
