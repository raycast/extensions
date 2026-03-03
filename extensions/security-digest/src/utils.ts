import { Category, SecurityItem } from "./types";

export function categorizeItem(title: string, content: string): Category {
  const text = `${title} ${content}`.toLowerCase();

  // Vulnerability: CVEs, exploits, patches, zero-days
  if (
    /cve-\d{4}-\d+/i.test(text) ||
    /vulnerability|exploit|patch|zero-day|zeroday/i.test(text)
  ) {
    return "vulnerability";
  }

  // Intelligence: Threat actors, malware, research, incidents, breaches
  if (
    /apt\s*\d+|ransomware|malware|phishing|apt group|threat actor|ioc|research|analysis|technical|breach|leak|hack|attack|incident|compromised/i.test(
      text,
    )
  ) {
    return "intelligence";
  }

  // News: General industry, tools, regulation, misc
  return "news";
}

export function mergeCVEItems(items: SecurityItem[]): SecurityItem[] {
  const cveMap = new Map<string, SecurityItem>();
  const nonCveItems: SecurityItem[] = [];

  for (const item of items) {
    const cveMatch = item.title.match(/CVE-\d{4}-\d+/i);

    if (cveMatch) {
      const cveId = cveMatch[0].toUpperCase();

      if (cveMap.has(cveId)) {
        // Merge sources
        const existing = cveMap.get(cveId)!;
        existing.sources = existing.sources || [existing.source!];
        if (!existing.sources.includes(item.source!)) {
          existing.sources.push(item.source!);
        }
        // Keep the most detailed content
        if (item.content.length > existing.content.length) {
          existing.content = item.content;
          existing.link = item.link;
        }
      } else {
        item.cveId = cveId;
        cveMap.set(cveId, item);
      }
    } else {
      nonCveItems.push(item);
    }
  }

  // Update title for merged items
  for (const item of cveMap.values()) {
    if (item.sources && item.sources.length > 1) {
      item.title = `[${item.sources.length} sources] ${item.title}`;
    }
  }

  return [...Array.from(cveMap.values()), ...nonCveItems];
}

export function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function extractCVEs(text: string): string[] {
  const matches = text.match(/CVE-\d{4}-\d+/gi);
  return matches ? [...new Set(matches.map((m) => m.toUpperCase()))] : [];
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>?/gm, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
