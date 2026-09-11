interface PreviewInput {
  content: string;
  description: string;
  isTruncated: boolean;
  title: string;
}

interface TreeEntry {
  path: string;
  size?: number;
  type: "blob";
}

interface FileTreeInput {
  directoryPath?: string;
  entries: TreeEntry[];
  maxEntries?: number;
}

type SkillDetailMarkdownInput = PreviewInput & FileTreeInput;

interface SkillTagsInput {
  primaryCategory?: string;
  tags?: string[];
}

export interface SkillFrontmatterData {
  allowedTools?: string;
  compatibility?: string;
  description: string;
  license?: string;
  metadata?: Record<string, string>;
  name: string;
}

const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/u;

export const extractFrontmatter = (content: string) => {
  const match = content.match(FRONTMATTER_PATTERN);
  if (!match) {
    return "";
  }

  return match[0]
    .replace(/^---\r?\n/u, "")
    .replace(/\r?\n---\r?\n?$/u, "")
    .trim();
};

const normalizeFrontmatterKey = (value: string) => value.trim().toLowerCase().replaceAll("_", "-");

const stripWrappingQuotes = (value: string) => {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
};

const toJoinedValue = (value: string | string[] | undefined): string | undefined => {
  if (!value) {
    return undefined;
  }
  return Array.isArray(value) ? value.join(", ") : value;
};

const readFrontmatterValue = (values: Record<string, string | string[] | undefined>, ...keys: string[]) => {
  for (const key of keys) {
    const resolved = toJoinedValue(values[key]);
    if (resolved) {
      return resolved;
    }
  }
  return;
};

const parseSkillFrontmatter = (source: string): SkillFrontmatterData | null => {
  const values: Record<string, string | string[] | undefined> = {};
  const metadata: Record<string, string> = {};
  let currentKey: string | null = null;
  let blockScalarKey: string | null = null;
  let blockScalarStyle: "folded" | "literal" | null = null;
  const blockScalarLines: string[] = [];

  const flushBlockScalar = () => {
    if (!blockScalarKey || !blockScalarStyle) {
      return;
    }

    while (blockScalarLines.at(0) === "") {
      blockScalarLines.shift();
    }
    while (blockScalarLines.at(-1) === "") {
      blockScalarLines.pop();
    }

    if (blockScalarLines.length > 0) {
      values[blockScalarKey] =
        blockScalarStyle === "folded"
          ? blockScalarLines
              .join("\n")
              .split(/\n\s*\n/u)
              .map((paragraph) => paragraph.split(/\n/u).join(" "))
              .join("\n")
          : blockScalarLines.join("\n").trim();
    }

    blockScalarKey = null;
    blockScalarStyle = null;
    blockScalarLines.length = 0;
  };

  for (const line of source.split(/\r?\n/u)) {
    const trimmed = line.trim();

    if (blockScalarKey !== null) {
      if (/^[\t ]/u.test(line) || trimmed === "") {
        blockScalarLines.push(trimmed);
        continue;
      }
      flushBlockScalar();
    }

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const topLevelMatch = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/u.exec(line);
    if (topLevelMatch) {
      const [, rawKey, rawValue] = topLevelMatch;
      if (!rawKey) {
        continue;
      }
      currentKey = normalizeFrontmatterKey(rawKey);
      const value = rawValue?.trim() ?? "";
      if (/^[>|][->+]?$/u.test(value)) {
        blockScalarKey = currentKey;
        blockScalarStyle = value.startsWith(">") ? "folded" : "literal";
        blockScalarLines.length = 0;
        continue;
      }
      if (value) {
        values[currentKey] = stripWrappingQuotes(value);
      } else if (currentKey !== "metadata") {
        values[currentKey] = [];
      }
      continue;
    }

    if (currentKey === "metadata" && /^[\t ]/u.test(line)) {
      const metadataMatch = /^([A-Za-z0-9_.-]+):\s*(.*)$/u.exec(trimmed);
      if (metadataMatch) {
        const [, key, value] = metadataMatch;
        if (key !== undefined && value !== undefined) {
          metadata[key] = stripWrappingQuotes(value.trim());
        }
      }
      continue;
    }

    if (trimmed.startsWith("- ") && currentKey) {
      const existing = values[currentKey];
      const nextValue = stripWrappingQuotes(trimmed.slice(2).trim());
      if (Array.isArray(existing)) {
        values[currentKey] = [...existing, nextValue];
      } else if (existing) {
        values[currentKey] = [existing, nextValue];
      } else {
        values[currentKey] = [nextValue];
      }
    }
  }

  flushBlockScalar();

  const name = readFrontmatterValue(values, "name");
  const description = readFrontmatterValue(values, "description");
  if (!name || !description) {
    return null;
  }

  return {
    allowedTools: readFrontmatterValue(values, "allowed-tools", "allowedtools"),
    compatibility: readFrontmatterValue(values, "compatibility"),
    description,
    license: readFrontmatterValue(values, "license"),
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    name,
  };
};

export const parseSkillMarkdownDocument = (source: string) => {
  const frontmatter = extractFrontmatter(source);
  return {
    body: source.replace(FRONTMATTER_PATTERN, "").trim(),
    frontmatter: frontmatter ? parseSkillFrontmatter(frontmatter) : null,
  };
};

export const formatBytes = (bytes?: number | null) => {
  if (bytes === undefined || bytes === null) {
    return;
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"] as const;
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${Number(value.toFixed(value >= 10 ? 0 : 1))} ${units[unitIndex]}`;
};

export const formatDate = (timestamp?: number | null) => {
  if (!timestamp) {
    return;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
};

export const buildSkillPreviewMarkdown = ({ content, description, isTruncated, title }: PreviewInput) => {
  const { body } = parseSkillMarkdownDocument(content);
  const preview = body || [`# ${title}`, "", description].join("\n");
  return isTruncated ? `${preview}\n\n---\n\n_Preview truncated. Open on Skills.re for the full file._` : preview;
};

export const normalizeSkillTags = ({ primaryCategory, tags }: SkillTagsInput) => {
  const normalized: string[] = [];
  for (const value of [...(tags ?? []), primaryCategory]) {
    const tag = value?.trim();
    if (tag && !normalized.includes(tag)) {
      normalized.push(tag);
    }
  }
  return normalized;
};

export const stripDirectoryPath = (path: string, directoryPath?: string) => {
  const normalizedDirectory = directoryPath?.replace(/\/+$/u, "");
  if (normalizedDirectory && path.startsWith(`${normalizedDirectory}/`)) {
    return path.slice(normalizedDirectory.length + 1);
  }
  return path;
};

export const buildFileTreeMarkdown = ({ directoryPath, entries, maxEntries = 20 }: FileTreeInput) => {
  if (entries.length === 0) {
    return "";
  }

  const totalBytes = entries.reduce((total, entry) => total + (entry.size ?? 0), 0);
  const visibleEntries = entries
    .map((entry) => stripDirectoryPath(entry.path, directoryPath))
    .toSorted((a, b) => a.localeCompare(b))
    .slice(0, maxEntries);
  const hiddenCount = Math.max(0, entries.length - visibleEntries.length);
  const treeLines = visibleEntries.map((path, index) => {
    const isLast = index === visibleEntries.length - 1 && hiddenCount === 0;
    return `${isLast ? "└─" : "├─"} ${path}`;
  });

  if (hiddenCount > 0) {
    treeLines.push(`└─ … ${hiddenCount} more file${hiddenCount === 1 ? "" : "s"}`);
  }

  return [
    "## Files",
    "",
    `${entries.length} file${entries.length === 1 ? "" : "s"} · ${formatBytes(totalBytes) ?? "0 B"}`,
    "",
    "```text",
    ...treeLines,
    "```",
  ].join("\n");
};

export const buildSkillDetailMarkdown = ({ content, description, isTruncated, title }: SkillDetailMarkdownInput) => {
  const previewMarkdown = buildSkillPreviewMarkdown({
    content,
    description,
    isTruncated,
    title,
  });

  return previewMarkdown;
};
