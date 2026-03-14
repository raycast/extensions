export const SMITHERY_WEB_BASE = "https://smithery.ai";

/**
 * Returns the canonical Smithery web URL for an MCP server.
 */
export function buildMcpServerUrl(qualifiedName: string): string {
  return `${SMITHERY_WEB_BASE}/servers/${encodeURIComponent(qualifiedName)}`;
}

/**
 * Returns the canonical Smithery web URL for a skill.
 */
export function buildSkillUrl(namespace: string, slug: string): string {
  return `${SMITHERY_WEB_BASE}/skills/${encodeURIComponent(namespace)}/${encodeURIComponent(slug)}`;
}
