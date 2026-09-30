import type { McpServerDoc } from "@/types";

const MCP_BLOCK_KEYS = ["mcp_servers", "mcp", "mcpServers"] as const;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function detectMcpBlockKey(doc: Record<string, unknown>): string | null {
  for (const key of MCP_BLOCK_KEYS) {
    if (isPlainObject(doc[key])) {
      return key;
    }
  }
  return null;
}

export function getMcpServers(doc: Record<string, unknown>): Record<string, McpServerDoc> {
  const key = detectMcpBlockKey(doc);
  if (!key) {
    return {};
  }
  const block = doc[key];
  if (!isPlainObject(block)) {
    return {};
  }
  return block as Record<string, McpServerDoc>;
}

export function upsertMcpServer(
  doc: Record<string, unknown>,
  name: string,
  payload: McpServerDoc,
): Record<string, unknown> {
  const key = detectMcpBlockKey(doc) ?? "mcp_servers";
  const existingBlock = isPlainObject(doc[key]) ? (doc[key] as Record<string, McpServerDoc>) : {};
  const existingServer = existingBlock[name] ?? {};
  const mergedServer = { ...existingServer, ...payload };
  existingBlock[name] = mergedServer;
  doc[key] = existingBlock;
  return doc;
}

export function setMcpServer(
  doc: Record<string, unknown>,
  name: string,
  server: McpServerDoc,
): Record<string, unknown> {
  const key = detectMcpBlockKey(doc) ?? "mcp_servers";
  const existingBlock = isPlainObject(doc[key]) ? (doc[key] as Record<string, McpServerDoc>) : {};
  existingBlock[name] = server;
  doc[key] = existingBlock;
  return doc;
}

export function deleteMcpServer(doc: Record<string, unknown>, name: string): boolean {
  const key = detectMcpBlockKey(doc);
  if (!key) {
    return false;
  }
  const block = doc[key];
  if (!isPlainObject(block)) {
    return false;
  }
  if (!(name in block)) {
    return false;
  }
  delete (block as Record<string, McpServerDoc>)[name];
  return true;
}

export function buildDuplicateName(existingNames: string[], baseName: string): string {
  const normalized = new Set(existingNames.map((name) => name.toLowerCase()));
  let candidate = `${baseName}-copy`;
  let index = 2;
  while (normalized.has(candidate.toLowerCase())) {
    candidate = `${baseName}-copy-${index}`;
    index += 1;
  }
  return candidate;
}
