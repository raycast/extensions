import { KnowledgeBase, NoteSummary, RecallResult } from "./types";

function truncatePreview(content?: string, maxLength = 280): string {
  if (!content) {
    return "_No content preview available_";
  }

  const normalized = content.trim().replace(/\n{3,}/g, "\n\n");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

export function escapeMarkdown(content?: string): string {
  if (!content) {
    return "";
  }

  return content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\\/g, "\\\\")
    .replace(/(`|\*|_|{|}|\[|\]|\(|\)|#|\+|!|\|)/g, "\\$1")
    .replace(/^(\s*)([-+*])/gm, "$1\\$2")
    .replace(/^(\s*)(\d+)\./gm, "$1$2\\.");
}

export function normalizeTagInput(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function notePreviewMarkdown(
  note: Pick<NoteSummary, "title" | "content" | "note_type" | "created_at" | "tags">,
): string {
  const tags = note.tags?.length ? note.tags.map((tag) => escapeMarkdown(tag.name)).join(", ") : "_No tags_";
  const preview = escapeMarkdown(truncatePreview(note.content));

  return `# ${escapeMarkdown(note.title || "Untitled Note")}

- Type: ${escapeMarkdown(note.note_type || "Unknown")}
- Created At: ${escapeMarkdown(note.created_at || "Unknown")}
- Tags: ${tags}

## Preview

${preview}
`;
}

export function recallPreviewMarkdown(result: RecallResult): string {
  return `# ${escapeMarkdown(result.title || "Untitled Result")}

- Type: ${escapeMarkdown(result.note_type || "Unknown")}
${result.created_at ? `- Created At: ${escapeMarkdown(result.created_at)}` : ""}

${result.content ? escapeMarkdown(result.content) : "_No snippet returned_"}
`;
}

export function knowledgeBasePreviewMarkdown(topic: KnowledgeBase): string {
  return `# ${escapeMarkdown(topic.name || "Untitled Knowledge Base")}

${topic.description ? escapeMarkdown(topic.description) : "_No description_"}

- Topic ID: \`${escapeMarkdown(topic.topic_id)}\`
- Note Count: ${topic.stats?.note_count ?? 0}
- File Count: ${topic.stats?.file_count ?? 0}
- Blogger Count: ${topic.stats?.blogger_count ?? 0}
- Live Count: ${topic.stats?.live_count ?? 0}
`;
}
