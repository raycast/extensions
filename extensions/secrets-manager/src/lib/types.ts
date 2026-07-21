export type Secret = {
  id: string;
  name: string;
  value: string;
  folder: string[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
};

// A known tag. Display color is derived from the name (see components/tag-color.ts),
// so nothing about appearance is persisted.
export type TagInfo = { name: string };

export type Store = {
  version: 1;
  secrets: Secret[];
  folders: string[][];
  tags: TagInfo[];
};

export function emptyStore(): Store {
  return { version: 1, secrets: [], folders: [], tags: [] };
}

// Validate + migrate untrusted parsed JSON into a Store. Throws on structurally
// invalid input; tolerates missing optional fields from older versions.
export function normalizeStore(v: unknown): Store {
  if (typeof v !== "object" || v === null) throw new Error("invalid store: not an object");
  const o = v as Record<string, unknown>;
  if (!Array.isArray(o.secrets)) throw new Error("invalid store: secrets must be an array");
  const secrets = o.secrets.map(normalizeSecret);
  const folders = Array.isArray(o.folders) ? o.folders.map(normalizeFolder) : [];
  const tags = Array.isArray(o.tags) ? o.tags.map(normalizeTagInfo) : [];
  return { version: 1, secrets, folders, tags };
}

function normalizeSecret(v: unknown): Secret {
  if (typeof v !== "object" || v === null) throw new Error("invalid secret: not an object");
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string") throw new Error("invalid secret: id");
  if (typeof o.name !== "string") throw new Error("invalid secret: name");
  if (typeof o.value !== "string") throw new Error("invalid secret: value");
  const now = Date.now();
  return {
    id: o.id,
    name: o.name,
    value: o.value,
    folder: normalizeFolder(o.folder),
    tags: normalizeStringArray(o.tags),
    createdAt: typeof o.createdAt === "number" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : now,
  };
}

function normalizeFolder(v: unknown): string[] {
  return normalizeStringArray(v);
}

function normalizeStringArray(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || !v.every((x) => typeof x === "string")) {
    throw new Error("invalid field: expected string array");
  }
  return v as string[];
}

function normalizeTagInfo(v: unknown): TagInfo {
  if (typeof v !== "object" || v === null) throw new Error("invalid tag: not an object");
  const o = v as Record<string, unknown>;
  if (typeof o.name !== "string") throw new Error("invalid tag: name");
  return { name: o.name };
}
