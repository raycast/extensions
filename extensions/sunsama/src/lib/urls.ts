/**
 * Sunsama web links. Pure, so they're unit-testable — no Raycast or MCP
 * imports here.
 */

/**
 * The workspace slug from whatever the user pasted: a full task URL, the
 * workspace URL, or the bare slug. Returns null when there's nothing usable.
 */
export function workspaceSlug(input: string | undefined): string | null {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return null;

  // Prefer the slug out of a URL, so pasting a full task link works.
  const fromUrl = trimmed.match(/\/group\/([^/?#\s]+)/);
  const slug = fromUrl ? fromUrl[1] : trimmed.replace(/^\/+|\/+$/g, "");

  // Anything with a slash, space, or protocol left in it isn't a slug.
  return /^[\w.-]+$/.test(slug) ? slug : null;
}

/**
 * The Sunsama web link for a task. Sunsama scopes tasks to a workspace, and
 * the MCP server doesn't expose the slug, so it has to come from the setting —
 * callers resolve it with `workspaceSlug` first and skip the link without one.
 */
export function taskWebUrl(slug: string, taskId: string): string {
  return `https://app.sunsama.com/group/${slug}?taid=${encodeURIComponent(taskId)}`;
}
