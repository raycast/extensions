import type { Connection, ToolSummary } from "./types";

/** Built-in static tools need no account; other tools must retain their exact connection. */
export function connectedTools(tools: readonly ToolSummary[], connections: readonly Connection[]): ToolSummary[] {
  const bindings = new Set(connections.map((item) => JSON.stringify([item.integration, item.owner, item.name])));
  return tools.filter(
    (tool) => tool.static === true || bindings.has(JSON.stringify([tool.integration, tool.owner, tool.connection])),
  );
}
