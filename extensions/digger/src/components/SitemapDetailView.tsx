import { Detail, ActionPanel, Action, Icon, Keyboard } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import * as cheerio from "cheerio";
import { truncateText, formatDate } from "../utils/formatters";
import { LIMITS } from "../utils/config";

interface SitemapEntry {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
}

interface ParsedSitemap {
  type: "index" | "urlset" | "unknown";
  entries: SitemapEntry[];
  totalCount: number;
}

function parseSitemap(xml: string): ParsedSitemap {
  const $ = cheerio.load(xml, { xmlMode: true });

  // Check if it's a sitemap index (contains <sitemap> elements)
  const sitemapElements = $("sitemap");
  if (sitemapElements.length > 0) {
    const entries: SitemapEntry[] = [];
    sitemapElements.each((_, el) => {
      const loc = $(el).find("loc").text();
      if (loc) {
        entries.push({
          loc,
          lastmod: $(el).find("lastmod").text() || undefined,
        });
      }
    });
    return {
      type: "index",
      entries: entries.slice(0, LIMITS.MAX_DISPLAY_ENTRIES),
      totalCount: entries.length,
    };
  }

  // Check if it's a regular sitemap (contains <url> elements)
  const urlElements = $("url");
  if (urlElements.length > 0) {
    const entries: SitemapEntry[] = [];
    urlElements.each((_, el) => {
      const loc = $(el).find("loc").text();
      if (loc) {
        entries.push({
          loc,
          lastmod: $(el).find("lastmod").text() || undefined,
          changefreq: $(el).find("changefreq").text() || undefined,
          priority: $(el).find("priority").text() || undefined,
        });
      }
    });
    return {
      type: "urlset",
      entries: entries.slice(0, LIMITS.MAX_DISPLAY_ENTRIES),
      totalCount: entries.length,
    };
  }

  return { type: "unknown", entries: [], totalCount: 0 };
}

function formatSitemapMarkdown(sitemap: ParsedSitemap, url: string): string {
  const { type, entries, totalCount } = sitemap;

  if (type === "unknown" || entries.length === 0) {
    return `# Sitemap\n\nCould not parse sitemap structure. The file may be empty or in an unexpected format.\n\n**URL:** ${url}`;
  }

  const typeLabel = type === "index" ? "Sitemap Index" : "Sitemap";
  const entryType = type === "index" ? "child sitemaps" : "URLs";
  const countText =
    totalCount > LIMITS.MAX_DISPLAY_ENTRIES
      ? `Showing ${LIMITS.MAX_DISPLAY_ENTRIES} of ${totalCount} ${entryType}`
      : `${totalCount} ${entryType}`;

  let markdown = `# ${typeLabel}\n\n**${countText}**\n\n`;

  if (type === "index") {
    // Sitemap index - show child sitemaps
    markdown += "| Sitemap | Last Modified |\n";
    markdown += "| --- | --- |\n";
    entries.forEach((entry) => {
      const displayUrl = truncateText(entry.loc, 60);
      const lastmod = entry.lastmod ? formatDate(entry.lastmod) : "—";
      markdown += `| [${displayUrl}](${entry.loc}) | ${lastmod} |\n`;
    });
  } else {
    // Regular sitemap - show URLs with metadata
    markdown += "| URL | Last Modified | Freq | Priority |\n";
    markdown += "| --- | --- | --- | --- |\n";
    entries.forEach((entry) => {
      const displayUrl = truncateText(entry.loc, 50);
      const lastmod = entry.lastmod ? formatDate(entry.lastmod) : "—";
      const changefreq = entry.changefreq || "—";
      const priority = entry.priority || "—";
      markdown += `| [${displayUrl}](${entry.loc}) | ${lastmod} | ${changefreq} | ${priority} |\n`;
    });
  }

  return markdown;
}

export interface SitemapDetailViewProps {
  url: string;
  title?: string;
}

export function SitemapDetailView({ url, title = "View Sitemap" }: SitemapDetailViewProps) {
  const { data, isLoading, error } = useFetch<string>(url, {
    parseResponse: async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      return response.text();
    },
  });

  let markdown: string;

  if (error) {
    const errorMessage = error.message || String(error);
    const cleanMessage = errorMessage.split("\n")[0];
    markdown = `# Can't access sitemap\n\n${cleanMessage}\n\n---\n\nThis resource may be protected by the server or may not exist. Try opening it in your browser to see if you can access it directly.`;
  } else if (data) {
    const parsed = parseSitemap(data);
    markdown = formatSitemapMarkdown(parsed, url);
  } else {
    markdown = `# ${title}\n\nLoading sitemap...`;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={url}
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard
            title="Copy Sitemap URL"
            content={url}
            icon={Icon.Clipboard}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
        </ActionPanel>
      }
    />
  );
}
