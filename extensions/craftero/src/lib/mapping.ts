import {
  CraftCollectionSchema,
  CraftCollectionSchemaProperty,
  ZoteroItem,
} from "./types";
import { ZoteroClient } from "./zotero";

const FIELD_SYNONYMS: Record<string, string[]> = {
  authors: ["authors", "author", "creators"],
  year: [
    "year",
    "publicationyear",
    "publication year",
    "publication_year",
    "pubyear",
  ],
  journal: [
    "journal",
    "publication",
    "publisher",
    "journalpublisher",
    "journal/publisher",
  ],
  url: ["url", "link", "doi"],
  zoteroLink: [
    "zotero link",
    "zotero_link",
    "zoterolink",
    "zotero uri",
    "zotero_uri",
  ],
  dateAdded: ["date added", "dateadded", "date_added", "added"],
  publicationType: [
    "publication type",
    "publicationtype",
    "item type",
    "itemtype",
    "type",
  ],
  tags: ["tags", "tag"],
  abstract: ["abstract", "abstractnote", "summary"],
  citationKey: ["citation key", "citationkey", "citekey", "citation_key"],
  status: ["status", "reading status", "readingstatus"],
  readingDate: [
    "reading date",
    "readingdate",
    "reading_date",
    "date read",
    "read date",
  ],
};

export function normalizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function buildSchemaIndex(
  schema: CraftCollectionSchema | null,
): Map<string, CraftCollectionSchemaProperty> {
  const index = new Map<string, CraftCollectionSchemaProperty>();
  if (!schema?.properties) return index;

  for (const prop of schema.properties) {
    if (!prop.name) continue;
    index.set(normalizeName(prop.name), prop);
    if (prop.key) {
      index.set(normalizeName(prop.key), prop);
    }
  }

  return index;
}

function findSchemaProperty(
  index: Map<string, CraftCollectionSchemaProperty>,
  synonyms: string[],
): CraftCollectionSchemaProperty | undefined {
  for (const name of synonyms) {
    const normalized = normalizeName(name);
    const prop = index.get(normalized);
    if (prop) return prop;
  }
  return undefined;
}

function optionToString(option: unknown): string | null {
  if (typeof option === "string") return option;
  if (typeof option === "number") return String(option);
  if (option && typeof option === "object") {
    const record = option as Record<string, unknown>;
    const candidate =
      record.name ?? record.title ?? record.value ?? record.label;
    if (typeof candidate === "string" || typeof candidate === "number") {
      return String(candidate);
    }
  }
  return null;
}

function normalizeOptions(
  options: unknown[],
): Array<{ raw: string; normalized: string }> {
  return options
    .map((option) => optionToString(option))
    .filter((option): option is string => Boolean(option))
    .map((option) => ({ raw: option, normalized: option.toLowerCase() }));
}

function matchOption(options: unknown[], value: string): string | undefined {
  const normalizedValue = value.toLowerCase();
  const normalizedOptions = normalizeOptions(options);
  const match = normalizedOptions.find(
    (option) => option.normalized === normalizedValue,
  );
  return match?.raw;
}

function setPropertyValue(
  properties: Record<string, unknown>,
  prop: CraftCollectionSchemaProperty | undefined,
  value: unknown,
) {
  if (!prop) return;
  if (value === undefined || value === null) return;
  if (typeof value === "string" && value.trim() === "") return;

  const options = prop.options || [];
  const lowerType = prop.type.toLowerCase();
  const expectsObject =
    lowerType.includes("block") ||
    lowerType.includes("link") ||
    lowerType.includes("reference") ||
    lowerType.includes("relation") ||
    lowerType.includes("object");

  switch (prop.type) {
    case "number": {
      const parsed =
        typeof value === "number" ? value : Number.parseInt(String(value), 10);
      if (!Number.isNaN(parsed)) {
        properties[prop.key] = parsed;
      }
      break;
    }
    case "url": {
      properties[prop.key] = String(value);
      break;
    }
    case "date": {
      properties[prop.key] = String(value);
      break;
    }
    case "select": {
      if (options.length === 0) {
        properties[prop.key] = String(value);
        break;
      }
      const match = matchOption(options, String(value));
      if (match) {
        properties[prop.key] = match;
      } else {
        properties[prop.key] = String(value);
      }
      break;
    }
    case "multiSelect": {
      if (options.length === 0) {
        const values = Array.isArray(value) ? value : [value];
        const normalized = values
          .map((val) => String(val).trim())
          .filter((val) => val.length > 0);
        if (normalized.length > 0) {
          properties[prop.key] = normalized;
        }
        break;
      }
      const values = Array.isArray(value) ? value : [value];
      const matched = values
        .map((val) => matchOption(options, String(val)) ?? String(val).trim())
        .filter((val): val is string => Boolean(val));

      if (matched.length > 0) {
        properties[prop.key] = matched;
      }
      break;
    }
    case "text":
    case "richText": {
      properties[prop.key] = String(value);
      break;
    }
    default: {
      if (expectsObject && typeof value === "string") {
        properties[prop.key] = buildLinkObject(value);
      } else {
        properties[prop.key] = value;
      }
    }
  }
}

function chooseStatusOption(
  prop: CraftCollectionSchemaProperty | undefined,
): string | undefined {
  if (!prop?.options || prop.options.length === 0) return undefined;

  const preferred = [
    "to read",
    "waiting",
    "next up",
    "nextup",
    "backlog",
    "unread",
  ];
  const normalizedOptions = normalizeOptions(prop.options);
  for (const candidate of preferred) {
    const match = normalizedOptions.find(
      (option) => option.normalized === candidate,
    );
    if (match) return match.raw;
  }

  return undefined;
}

export function getReadingDateProperty(
  schemaIndex: Map<string, CraftCollectionSchemaProperty>,
): CraftCollectionSchemaProperty | undefined {
  return findSchemaProperty(schemaIndex, FIELD_SYNONYMS.readingDate);
}

function buildLinkObject(value: string): { blockId: string; title: string } {
  const datePrefix = "date://";
  if (value.startsWith(datePrefix)) {
    const dateString = value.slice(datePrefix.length);
    return { blockId: value, title: formatDateTitle(dateString) };
  }

  return { blockId: value, title: value };
}

export function buildCraftProperties(
  item: ZoteroItem,
  schemaIndex: Map<string, CraftCollectionSchemaProperty>,
  overrides?: { citationKey?: string; skipStatus?: boolean },
): Record<string, unknown> {
  const creators = ZoteroClient.formatAuthors(item.data.creators);
  const year = ZoteroClient.extractYear(item.data.date);
  const journal = getJournalPublisher(item);
  const url = item.data.url || item.data.DOI || "";
  const dateAdded = normalizeDateOnly(item.data.dateAdded);
  const itemType = ZoteroClient.formatItemType(item.data.itemType);
  const rawTags = item.data.tags || [];
  const tagNames = rawTags.map((tag) => tag.tag.trim()).filter(Boolean);
  const zoteroLink = `zotero://select/library/items/${item.key}`;
  const citationKey = overrides?.citationKey ?? item.data.citationKey;
  const abstract = item.data.abstractNote || "";

  const properties: Record<string, unknown> = {};

  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.authors),
    creators,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.year),
    year,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.journal),
    journal,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.url),
    url,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.zoteroLink),
    zoteroLink,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.dateAdded),
    dateAdded,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.publicationType),
    itemType,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.citationKey),
    citationKey,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.abstract),
    abstract,
  );
  setPropertyValue(
    properties,
    findSchemaProperty(schemaIndex, FIELD_SYNONYMS.tags),
    tagNames,
  );

  // Only set Status for new items, not updates (preserve user's manual Status choice)
  if (!overrides?.skipStatus) {
    const statusProp = findSchemaProperty(schemaIndex, FIELD_SYNONYMS.status);
    const statusValue = chooseStatusOption(statusProp);
    setPropertyValue(properties, statusProp, statusValue);
  }

  return properties;
}

export function getJournalPublisher(item: ZoteroItem): string {
  const publicationTitle = item.data.publicationTitle || "";
  const publisher =
    item.data.publisher ||
    item.data.institution ||
    item.data.archive ||
    item.data.repository ||
    "";
  const itemType = (item.data.itemType || "").toLowerCase();
  const isBookOrPreprint = [
    "book",
    "booksection",
    "bookchapter",
    "bookpart",
    "preprint",
  ].includes(itemType);

  if (!isBookOrPreprint) {
    return publicationTitle;
  }

  if (publicationTitle && publisher) {
    return `${publicationTitle} · ${publisher}`;
  }

  return publicationTitle || publisher;
}

export function getLocalDateString(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().split("T")[0];
}

export function formatDateTitle(dateString: string): string {
  const [year, month, day] = dateString
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  const date = new Date(year, month - 1, day);
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);

  if (dateString === getLocalDateString()) {
    return `Today, ${formatted}`;
  }

  return formatted;
}

function normalizeDateOnly(value?: string): string {
  if (!value) return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
