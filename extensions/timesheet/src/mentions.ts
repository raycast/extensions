/**
 * Shared shape of the AI Chat `@` menu: the mention searches in `src/tools/search-*.ts`
 * return items with these URIs, and `src/read-item.ts` turns a URI back into Markdown.
 */
export type MentionItem = {
  title: string;
  uri?: string;
  content?: string;
  description?: string;
  icon?: string;
};

/** Raycast caps a mention list at 50 items. */
export const MENTION_LIMIT = 50;

const PREFIX = "timesheet://";

export function projectUri(id: string): string {
  return `${PREFIX}project/${id}`;
}

export function todoUri(id: string): string {
  return `${PREFIX}todo/${id}`;
}

export function parseUri(
  uri: string,
): { kind: "project" | "todo"; id: string } | undefined {
  const match = /^timesheet:\/\/(project|todo)\/([^/?#]+)$/.exec(uri);
  if (!match) return undefined;
  return { kind: match[1] as "project" | "todo", id: match[2] };
}
