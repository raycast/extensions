import type { Document, JsonFormat } from "@mendable/firecrawl-js";
import firecrawl from "./firecrawl";

// Firecrawl shuts down the LLMs.txt API (/v1/llmstxt) on December 10, 2026, so the files are built from map and
// batch scrape results instead, following https://docs.firecrawl.dev/migrating-from-llmstxt
const pageSummaryFormat: JsonFormat = {
  type: "json",
  prompt: "Write a 3-4 word title and a 9-10 word description of this page.",
  schema: {
    type: "object",
    properties: { title: { type: "string" }, description: { type: "string" } },
    required: ["title", "description"],
  },
};

export async function generateLlmsTxt(url: string, options: { maxUrls: number; showFullText: boolean }) {
  const { links } = await firecrawl.map(url, {
    limit: options.maxUrls,
    includeSubdomains: false,
    integration: "raycast",
  });
  const urls = links.map((link) => link.url);
  const pages = urls.length > 0 ? await scrapePages(urls, options.showFullText) : [];

  // Batch results come back in the order they finish, so put them back in map order.
  const mapOrder = new Map(urls.map((pageUrl, index) => [pageUrl, index]));
  const position = (page: Document) => mapOrder.get(page.metadata?.sourceURL ?? "") ?? urls.length;

  let llmstxt = `# ${url} llms.txt\n\n`;
  let llmsfulltxt = `# ${url} llms-full.txt\n\n`;
  for (const page of pages
    .filter((page) => (page.metadata?.statusCode ?? 200) < 400)
    .sort((a, b) => position(a) - position(b))) {
    const summary = (page.json ?? {}) as { title?: unknown; description?: unknown };
    const pageUrl = page.metadata?.url ?? page.metadata?.sourceURL ?? "";
    const title = text(summary.title) ?? text(page.metadata?.title) ?? pageUrl;
    const description = text(summary.description) ?? text(page.metadata?.description) ?? "";
    llmstxt += `- [${title}](${pageUrl}): ${description}\n`;
    llmsfulltxt += `## ${title}\n${page.markdown ?? ""}\n\n`;
  }

  return { llmstxt, llmsfulltxt: options.showFullText ? llmsfulltxt : undefined };
}

async function scrapePages(urls: string[], showFullText: boolean): Promise<Document[]> {
  const { id } = await firecrawl.startBatchScrape(urls, {
    options: { formats: showFullText ? ["markdown", pageSummaryFormat] : [pageSummaryFormat] },
    integration: "raycast",
  });

  // Poll without following `next`: a running job's cursor can point back at itself. Follow pagination only
  // once the job has completed so we don't fetch unfinished result pages.
  let job = await firecrawl.getBatchScrapeStatus(id, { autoPaginate: false });
  while (job.status === "scraping") {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    job = await firecrawl.getBatchScrapeStatus(id, { autoPaginate: false });
  }
  if (job.status !== "completed") {
    throw new Error(`Batch scrape ${job.status}`);
  }

  return (await firecrawl.getBatchScrapeStatus(id)).data;
}

// Page metadata can hold a string or a list of strings.
function text(value: unknown): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" && first.trim() ? first.trim() : undefined;
}
