import { formatJson, isJsonObject } from "./json";
import { JsonObject, JsonValue } from "../types/api";

export interface PromptDisplay {
  author?: string;
  content?: string;
  description?: string;
  id?: string;
  kind?: string;
  preview?: string;
  raw: JsonValue;
  saved?: boolean;
  tags: string[];
  title: string;
  url?: string;
}

function optionalString(record: JsonObject, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function optionalBoolean(record: JsonObject, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function stringList(value: JsonValue | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (isJsonObject(item)) {
      const label = optionalString(item, "name") ?? optionalString(item, "slug") ?? optionalString(item, "title");
      return label ? [label] : [];
    }
    return [];
  });
}

function authorName(record: JsonObject): string | undefined {
  const direct = optionalString(record, "authorName") ?? optionalString(record, "username");
  if (direct) return direct;
  const author = record.author;
  if (!isJsonObject(author)) return undefined;
  return optionalString(author, "name") ?? optionalString(author, "username") ?? optionalString(author, "displayName");
}

function webUrl(record: JsonObject, baseUrl?: string): string | undefined {
  const candidate =
    optionalString(record, "url") ?? optionalString(record, "webUrl") ?? optionalString(record, "permalink");
  if (!candidate) return undefined;
  try {
    const url = baseUrl ? new URL(candidate, `${baseUrl}/`) : new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export function parsePromptDisplay(value: JsonValue, index: number, baseUrl?: string): PromptDisplay {
  if (!isJsonObject(value)) {
    return { raw: value, tags: [], title: typeof value === "string" ? value : `Prompt ${index + 1}` };
  }

  const author = authorName(value);
  const content = optionalString(value, "content");
  const description = optionalString(value, "description");
  const id = optionalString(value, "id");
  const kind = optionalString(value, "kind");
  const preview = optionalString(value, "contentPreview");
  const saved = optionalBoolean(value, ["saved", "isSaved", "viewerHasSaved"]);
  const url = webUrl(value, baseUrl);

  return {
    ...(author ? { author } : {}),
    ...(content ? { content } : {}),
    ...(description ? { description } : {}),
    ...(id ? { id } : {}),
    ...(kind ? { kind } : {}),
    ...(preview ? { preview } : {}),
    raw: value,
    ...(saved !== undefined ? { saved } : {}),
    tags: [...stringList(value.tags), ...stringList(value.topics)].slice(0, 6),
    title: optionalString(value, "title") ?? optionalString(value, "name") ?? `Prompt ${index + 1}`,
    ...(url ? { url } : {}),
  };
}

function safeHeading(value: string): string {
  return value.replace(/[\r\n#]/g, " ").trim();
}

export function promptMarkdown(prompt: PromptDisplay): string {
  const lines = [`# ${safeHeading(prompt.title)}`];
  const metadata = [prompt.kind, prompt.author ? `by ${prompt.author}` : undefined].filter(Boolean).join(" · ");
  if (metadata) lines.push("", metadata);
  if (prompt.description) lines.push("", prompt.description);
  if (prompt.tags.length > 0) lines.push("", prompt.tags.map((tag) => `\`${tag}\``).join(" "));
  if (prompt.content) lines.push("", "## Prompt", "", `\`\`\`\`text\n${prompt.content}\n\`\`\`\``);
  if (!prompt.content && prompt.preview) lines.push("", "## Preview", "", prompt.preview);
  if (!prompt.content && !prompt.preview)
    lines.push("", "## API response", "", `\`\`\`\`json\n${formatJson(prompt.raw)}\n\`\`\`\``);
  return lines.join("\n");
}
