import type { FetchError, FetchFormat, FetchResult, SearchFilters, SearchResult } from "./tinyfish";

export function formatFetchError(failure: FetchError) {
  if (failure.error === "selector_not_matched") {
    const candidates = failure.candidate_selectors?.length
      ? `\n\nSuggested selectors: ${failure.candidate_selectors.join(", ")}`
      : "";
    return `No content matched the include selectors. Go back to adjust the selectors or fetch the full page.${candidates}`;
  }
  if (failure.error === "selector_unsupported")
    return "This document does not support CSS selectors. Fetch the full page to read it.";
  return `${failure.error}${failure.status ? ` (${failure.status})` : ""}`;
}

export function parseURLInput(input: string): string[] {
  const urls = [...new Set(input.split(/\s+/).filter(Boolean))];
  if (!urls.length) throw new Error("Enter at least one URL.");
  if (urls.length > 10) throw new Error("Fetch up to 10 URLs at a time.");
  for (const value of urls) {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    } catch {
      throw new Error(`Enter a complete http:// or https:// URL: ${value}`);
    }
  }
  return urls;
}

export function getContentText(page: FetchResult) {
  return typeof page.text === "string" ? page.text : JSON.stringify(page.text, null, 2);
}

function fencedCode(text: string, language: string) {
  const longestFence = Math.max(2, ...(text.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longestFence + 1);
  return `${fence}${language}\n${text}\n${fence}`;
}

export function formatPage(page: FetchResult, format: FetchFormat = "markdown") {
  const text = getContentText(page);
  const outputFormat = page.format ?? format;
  const body = outputFormat === "markdown" ? text : fencedCode(text, outputFormat);
  const description = page.description ? `\n\n${page.description}` : "";
  return `# ${page.title || page.url}\n\n${page.final_url ?? page.url}${description}\n\n---\n\n${body}`;
}

export function formatSearchResult(result: SearchResult) {
  const metadata = [
    result.publisher || result.site_name ? `**Source:** ${result.publisher || result.site_name}` : undefined,
    result.date ? `**Published:** ${result.date}` : undefined,
    result.authors?.length ? `**Authors:** ${result.authors.join(", ")}` : undefined,
    result.venue ? `**Venue:** ${result.venue}` : undefined,
    result.year !== undefined && result.year !== null ? `**Year:** ${result.year}` : undefined,
    result.cited_by_count !== undefined && result.cited_by_count !== null
      ? `**Citations:** ${result.cited_by_count}`
      : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");
  return `# ${result.title}\n\n${result.url}\n\n${metadata}${result.snippet ? `\n\n${result.snippet}` : ""}`;
}

export function hostname(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function filterSummary(filters: SearchFilters) {
  const parts = [filters.type === "research_paper" ? "Research Papers" : filters.type === "news" ? "News" : "Web"];
  if (filters.type === "research_paper") {
    if (filters.yearFrom !== undefined) parts.push(`from ${filters.yearFrom}`);
    if (filters.yearTo !== undefined) parts.push(`through ${filters.yearTo}`);
  } else if (filters.time.kind === "recent") {
    const labels: Record<number, string> = {
      60: "past hour",
      1440: "past day",
      10080: "past week",
      43200: "past 30 days",
      525600: "past year",
    };
    parts.push(labels[filters.time.minutes] ?? `past ${filters.time.minutes} minutes`);
  } else if (filters.time.kind === "dates") {
    if (filters.time.after) parts.push(`after ${filters.time.after}`);
    if (filters.time.before) parts.push(`before ${filters.time.before}`);
  }
  if (filters.includeDomains) parts.push(`in ${filters.includeDomains}`);
  if (filters.excludeDomains) parts.push(`excluding ${filters.excludeDomains}`);
  return parts.join(" · ");
}
