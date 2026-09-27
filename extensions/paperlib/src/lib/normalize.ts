import type { PaperEntity, PaperTag } from "./types";

export function normalizePapers(raw: unknown): PaperEntity[] {
  const records = extractRecords(raw);
  return records.map(normalizePaper).filter((paper) => paper.title || paper.doi || paper.arxiv);
}

export function normalizePaper(raw: unknown): PaperEntity {
  const record = asRecord(raw);

  const tags = normalizeTags(record.tags);
  const folders = normalizeTags(record.folders);
  const note = asString(record.note);
  const abstract = asString(record.abstract);

  return {
    id: asString(record.id ?? record._id) || slugId(asString(record.title), asString(record.doi)),
    title: asString(record.title),
    authors: asString(record.authors),
    abstract,
    note,
    publication: asString(record.publication),
    pubTime: asString(record.pubTime ?? record.year),
    pubType: asNumber(record.pubType),
    doi: stripDoi(asString(record.doi)),
    arxiv: asString(record.arxiv ?? record.eprint),
    mainURL: asString(record.mainURL ?? record.mainUrl),
    publisher: asString(record.publisher),
    pages: asString(record.pages),
    volume: asString(record.volume),
    number: asString(record.number),
    rating: asNumber(record.rating),
    flag: isFlagged(record.flag),
    tags,
    folders,
    addTime: record.addTime ? String(record.addTime) : undefined,
  };
}

function extractRecords(raw: unknown): unknown[] {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed || trimmed === "{}") {
      return [];
    }
    try {
      return extractRecords(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }
  if (typeof raw !== "object") {
    return [];
  }

  const record = raw as Record<string, unknown>;
  for (const key of ["data", "papers", "items", "results"]) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  const values = Object.values(record);
  if (
    values.length > 0 &&
    values.every((value) => value && typeof value === "object" && "title" in (value as object))
  ) {
    return values;
  }

  if ("title" in record) {
    return [record];
  }

  return [];
}

function normalizeTags(raw: unknown): PaperTag[] {
  if (!Array.isArray(raw)) {
    if (typeof raw === "string" && raw.trim()) {
      return raw
        .split(/[;,]/)
        .map((name) => ({ name: name.trim() }))
        .filter((tag) => tag.name);
    }
    return [];
  }

  return raw
    .map((item) => {
      if (typeof item === "string") {
        return { name: item };
      }
      const record = asRecord(item);
      const name = asString(record.name);
      return name ? { name, color: asString(record.color) || undefined } : undefined;
    })
    .filter((tag): tag is PaperTag => Boolean(tag));
}

function asRecord(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  if (value == null) {
    return "";
  }
  return String(value).trim();
}

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isFlagged(value: unknown): boolean {
  return value === true || value === 1 || (typeof value === "string" && /^(true|1)$/i.test(value.trim()));
}

function stripDoi(doi: string): string {
  return doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").trim();
}

function slugId(title: string, doi: string): string {
  if (doi) {
    return doi;
  }
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "paper"
  );
}
