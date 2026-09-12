import { getPreferenceValues } from "@raycast/api";

import { addModifiersToKeyword, raycastProtocol } from "../helpers";

type ContentType = "all" | "prompts" | "presets" | "quicklinks" | "snippets" | "themes";

type Input = {
  /**
   * Keywords or a short phrase describing the item to find. Search is performed against the public Raycast Explorer catalog.
   */
  query: string;
  /**
   * Catalog to search. Use "all" when the user has not specified a content type.
   */
  contentType?: ContentType;
  /**
   * Maximum number of results to return, from 1 to 10. Defaults to 5.
   */
  limit?: number;
};

type Category<T> = {
  name: string;
  slug: string;
} & Record<string, T[]>;

type Theme = {
  author: string;
  authorUsername: string;
  version: string | number;
  name: string;
  appearance: "light" | "dark";
  slug: string;
  colors: Record<string, string>;
};

type SearchResult = {
  type: Exclude<ContentType, "all">;
  id: string;
  title: string;
  category?: string;
  summary: string;
  importUrl: string;
};

const catalogTypes: Exclude<ContentType, "all">[] = ["prompts", "presets", "quicklinks", "snippets", "themes"];

/**
 * Search public prompts, presets, Quicklinks, snippets, and themes from ray.so. This is read-only: use it to recommend catalog items, not to inspect or change the user's personal Raycast data.
 */
export default async function searchLibrary(input: Input): Promise<{
  query: string;
  contentType: ContentType;
  count: number;
  results: SearchResult[];
}> {
  const query = input.query.trim();
  if (!query) {
    return { query, contentType: input.contentType ?? "all", count: 0, results: [] };
  }

  const contentType = input.contentType ?? "all";
  const limit = Math.min(10, Math.max(1, input.limit ?? 5));
  const types = contentType === "all" ? catalogTypes : [contentType];
  const settled = await Promise.allSettled(types.map(fetchCatalog));
  const results = settled.flatMap((outcome) => (outcome.status === "fulfilled" ? outcome.value : []));

  if (settled.every((outcome) => outcome.status === "rejected")) {
    const firstRejection = settled.find((outcome): outcome is PromiseRejectedResult => outcome.status === "rejected");
    throw firstRejection?.reason instanceof Error
      ? firstRejection.reason
      : new Error("Could not load Raycast Explorer catalogs");
  }

  const matches = results
    .map((result) => ({ result, score: scoreResult(result, query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.result.title.localeCompare(b.result.title))
    .slice(0, limit)
    .map(({ result }) => result);

  return {
    query,
    contentType,
    count: matches.length,
    results: matches,
  };
}

async function fetchCatalog(contentType: Exclude<ContentType, "all">): Promise<SearchResult[]> {
  const response = await fetch(`https://ray.so/api/${contentType}`);
  if (!response.ok) {
    throw new Error(`Could not load ${contentType}: ${response.status} ${response.statusText}`);
  }

  if (contentType === "themes") {
    const themes = (await response.json()) as Theme[];
    return themes.map((theme) => ({
      type: "themes",
      id: theme.slug,
      title: theme.name,
      summary: `${theme.appearance} theme by ${theme.author}; ${Object.values(theme.colors).join(" ")}`,
      importUrl: themeImportUrl(theme),
    }));
  }

  const categories = (await response.json()) as Category<Record<string, unknown>>[];
  return categories.flatMap((category) => {
    const entries = category[contentType] ?? [];
    return entries.map((entry) => catalogResult(contentType, category, entry));
  });
}

function catalogResult(
  type: Exclude<ContentType, "all" | "themes">,
  category: Category<Record<string, unknown>>,
  entry: Record<string, unknown>,
): SearchResult {
  const title = stringValue(entry.name) || stringValue(entry.title) || "Untitled";
  const id = stringValue(entry.id) || title;
  const summary = [
    stringValue(entry.description),
    stringValue(entry.prompt),
    stringValue(entry.instructions),
    stringValue(entry.text),
    stringValue(entry.keyword),
    stringValue(entry.link),
  ]
    .filter(Boolean)
    .join(" ");

  return {
    type,
    id,
    title,
    category: category.name,
    summary: summarize(summary),
    importUrl: importUrl(type, entry),
  };
}

function importUrl(type: Exclude<ContentType, "all" | "themes">, entry: Record<string, unknown>): string {
  if (type === "prompts") {
    const prompt = {
      title: stringValue(entry.title),
      prompt: stringValue(entry.prompt),
      creativity: entry.creativity,
      icon: entry.icon,
      model: normalizeModel(entry.model),
    };
    return `${raycastProtocol}prompts/import?prompts=${encodeURIComponent(JSON.stringify(prompt))}`;
  }

  if (type === "presets") {
    const preset = {
      name: stringValue(entry.name),
      description: stringValue(entry.description),
      instructions: stringValue(entry.instructions),
      creativity: entry.creativity,
      icon: entry.icon,
      model: normalizeModel(entry.model),
      web_search: entry.web_search,
      image_generation: entry.image_generation,
      id: stringValue(entry.id),
    };
    return `${raycastProtocol}presets/import?preset=${encodeURIComponent(JSON.stringify(preset))}`;
  }

  if (type === "quicklinks") {
    const quicklink = {
      name: stringValue(entry.name),
      link: stringValue(entry.link),
      openWith: stringValue(entry.openWith) || undefined,
      iconName: objectValue(entry.icon)?.name ? `${stringValue(objectValue(entry.icon)?.name)}-16` : undefined,
    };
    return `${raycastProtocol}quicklinks/import?quicklinks=${encodeURIComponent(JSON.stringify(quicklink))}`;
  }

  const snippetType = stringValue(entry.type);
  const keyword = stringValue(entry.keyword);
  const { startModifier = "!", endModifier = "none" } = getPreferenceValues<Preferences.ExploreSnippets>();
  const snippet = {
    name: stringValue(entry.name),
    text: stringValue(entry.text),
    keyword:
      snippetType === "spelling"
        ? keyword
        : addModifiersToKeyword({
            keyword,
            start: startModifier,
            end: endModifier,
          }),
    type: snippetType,
  };
  return `${raycastProtocol}snippets/import?snippet=${encodeURIComponent(JSON.stringify(snippet))}`;
}

function themeImportUrl(theme: Theme): string {
  const encodedColors = Object.values(theme.colors).map(encodeURIComponent).join(",");
  return `${raycastProtocol}theme?version=${theme.version}&name=${encodeURIComponent(theme.name)}&appearance=${encodeURIComponent(
    theme.appearance,
  )}&colors=${encodedColors}`;
}

function scoreResult(result: SearchResult, query: string): number {
  const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const title = result.title.toLocaleLowerCase();
  const searchable = `${title} ${result.category ?? ""} ${result.summary}`.toLocaleLowerCase();

  return terms.reduce((score, term) => {
    if (!searchable.includes(term)) return score;
    return score + (title.includes(term) ? 3 : 1);
  }, 0);
}

function summarize(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 280 ? `${normalized.slice(0, 277)}...` : normalized;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeModel(value: unknown): unknown {
  const model = stringValue(value);
  return /^".*"$/.test(model) ? model.slice(1, -1) : value;
}
