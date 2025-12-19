export type VaultRecordId = string;

export interface VaultRecordMetadata {
  id: VaultRecordId;
  keyName: string; // normalized (kebab-case)
  application: string;
  service: string;
  tags: string[];
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
}

export interface CreateVaultRecordInput {
  keyName: string;
  application: string;
  service: string;
  tags: string[];
  apiKey: string;
}

export interface UpdateVaultRecordInput {
  keyName?: string;
  application?: string;
  service?: string;
  tags?: string[];
  apiKey?: string;
}

const KEY_NAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeKeyName(raw: string): string {
  // Auto-normalize into kebab-case:
  // - lowercase
  // - replace spaces/underscores with hyphen
  // - drop invalid characters
  // - collapse repeated hyphens
  // - trim hyphens from ends
  const lower = raw.toLowerCase();
  const replaced = lower.replace(/[\s_]+/g, "-");
  const stripped = replaced.replace(/[^a-z0-9-]/g, "");
  const collapsed = stripped.replace(/-+/g, "-");
  return collapsed.replace(/^-+/, "").replace(/-+$/, "");
}

export function normalizeKeyNameForTyping(raw: string): string {
  // Like normalizeKeyName(), but keeps trailing hyphens so users can type
  // `openai-` and then continue with the next segment.
  const lower = raw.toLowerCase();
  const replaced = lower.replace(/[\s_]+/g, "-");
  const stripped = replaced.replace(/[^a-z0-9-]/g, "");
  const collapsed = stripped.replace(/-+/g, "-");
  return collapsed.replace(/^-+/, "");
}

export function validateKeyName(normalized: string): string | undefined {
  if (!normalized) return "Key name is required";
  if (!KEY_NAME_REGEX.test(normalized)) {
    return "Use kebab-case: a-z, 0-9, and single hyphens (e.g. openai-prod)";
  }
  return undefined;
}

export function normalizeTags(rawTags: string[]): string[] {
  const normalized = rawTags
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/\s+/g, " "))
    .map((t) => t.toLowerCase());

  // de-dupe while preserving order
  const seen = new Set<string>();
  const result: string[] = [];
  for (const t of normalized) {
    if (!seen.has(t)) {
      seen.add(t);
      result.push(t);
    }
  }
  return result;
}

export function parseTagsFromText(raw: string): string[] {
  if (!raw.trim()) return [];
  // Split on commas; allow users to type "tag1, tag2".
  return normalizeTags(raw.split(","));
}

export function formatTagsForText(tags: string[]): string {
  return tags.join(", ");
}
