import { parseHTML } from "linkedom";
import { parseLog } from "./logger";

type LinkedomDocument = ReturnType<typeof parseHTML>["document"];

/**
 * Metadata extracted from a page using Schema.org JSON-LD, Open Graph, Twitter Cards, and meta tags.
 * Inspired by Defuddle's metadata extraction approach.
 */
export interface ExtractedMetadata {
  title: string | null;
  author: string | null;
  published: string | null;
  modified: string | null;
  siteName: string | null;
  description: string | null;
  image: string | null;
  favicon: string | null;
  url: string | null;
  domain: string | null;
  /** Raw Schema.org data for use by extractors */
  schemaOrgData: Record<string, unknown> | null;
}

interface MetaTagItem {
  name: string | null;
  property: string | null;
  content: string | null;
}

/**
 * Extracts rich metadata from HTML documents using multiple sources.
 * Priority order: Schema.org JSON-LD → Open Graph → Twitter Cards → Standard meta tags → DOM elements
 */
export class MetadataExtractor {
  /**
   * Extract metadata from a parsed document
   */
  static extract(doc: LinkedomDocument, baseUrl: string): ExtractedMetadata {
    const schemaOrgData = this.parseSchemaOrg(doc);
    const metaTags = this.collectMetaTags(doc);

    let domain: string | null = null;
    let url: string | null = baseUrl;

    try {
      if (baseUrl) {
        domain = new URL(baseUrl).hostname.replace(/^www\./, "");
      }
    } catch {
      // Invalid URL
    }

    // If no URL provided, try to find canonical
    if (!url) {
      url =
        this.getMetaContent(metaTags, "property", "og:url") ||
        this.getMetaContent(metaTags, "property", "twitter:url") ||
        this.getSchemaProperty(schemaOrgData, "url") ||
        doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
        null;

      if (url) {
        try {
          domain = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          // Invalid URL
        }
      }
    }

    const metadata: ExtractedMetadata = {
      title: this.getTitle(doc, schemaOrgData, metaTags),
      author: this.getAuthor(doc, schemaOrgData, metaTags),
      published: this.getPublished(doc, schemaOrgData, metaTags),
      modified: this.getModified(schemaOrgData, metaTags),
      siteName: this.getSiteName(doc, schemaOrgData, metaTags),
      description: this.getDescription(schemaOrgData, metaTags),
      image: this.getImage(schemaOrgData, metaTags),
      favicon: this.getFavicon(doc, baseUrl),
      url,
      domain,
      schemaOrgData,
    };

    parseLog.log("metadata:extracted", {
      url: baseUrl,
      hasAuthor: !!metadata.author,
      hasPublished: !!metadata.published,
      hasSiteName: !!metadata.siteName,
      hasImage: !!metadata.image,
    });

    return metadata;
  }

  /**
   * Parse all JSON-LD script tags and merge into a single object
   */
  private static parseSchemaOrg(doc: LinkedomDocument): Record<string, unknown> | null {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    if (scripts.length === 0) return null;

    const results: Record<string, unknown>[] = [];

    scripts.forEach((script) => {
      try {
        const content = script.textContent?.trim();
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            results.push(...parsed);
          } else {
            results.push(parsed);
          }
        }
      } catch (e) {
        parseLog.warn("metadata:json-ld-parse-error", { error: String(e) });
      }
    });

    if (results.length === 0) return null;
    if (results.length === 1) return results[0];

    // Merge multiple JSON-LD blocks - look for Article types first
    const articleTypes = ["Article", "NewsArticle", "BlogPosting", "WebPage", "Report", "ScholarlyArticle"];
    for (const type of articleTypes) {
      const found = results.find((r) => {
        const rType = r["@type"];
        if (Array.isArray(rType)) return rType.includes(type);
        return rType === type;
      });
      if (found) return found;
    }

    return results[0];
  }

  /**
   * Collect all meta tags into a structured array
   */
  private static collectMetaTags(doc: LinkedomDocument): MetaTagItem[] {
    const tags: MetaTagItem[] = [];
    doc.querySelectorAll("meta").forEach((meta) => {
      tags.push({
        name: meta.getAttribute("name"),
        property: meta.getAttribute("property"),
        content: meta.getAttribute("content"),
      });
    });
    return tags;
  }

  /**
   * Get meta tag content by attribute type and value
   */
  private static getMetaContent(metaTags: MetaTagItem[], attr: "name" | "property", value: string): string | null {
    const tag = metaTags.find((t) => {
      const attrValue = attr === "name" ? t.name : t.property;
      return attrValue?.toLowerCase() === value.toLowerCase();
    });
    return tag?.content?.trim() || null;
  }

  /**
   * Get a property from Schema.org data, supporting nested paths like "author.name"
   */
  private static getSchemaProperty(
    data: Record<string, unknown> | null,
    path: string,
    defaultValue: string | null = null,
  ): string | null {
    if (!data) return defaultValue;

    const searchSchema = (obj: unknown, props: string[]): string[] => {
      if (typeof obj === "string") {
        return props.length === 0 ? [obj] : [];
      }

      if (typeof obj === "number") {
        return props.length === 0 ? [String(obj)] : [];
      }

      if (!obj || typeof obj !== "object") {
        return [];
      }

      if (Array.isArray(obj)) {
        // If we're at the end of the path and have an array of strings, return them
        if (props.length === 0 && obj.every((item) => typeof item === "string" || typeof item === "number")) {
          return obj.map(String);
        }
        // Otherwise search each item
        return obj.flatMap((item) => searchSchema(item, props));
      }

      const [currentProp, ...remainingProps] = props;

      if (!currentProp) {
        // At end of path - if object has a name property, use it
        if (typeof obj === "object" && obj !== null && "name" in obj) {
          const name = (obj as Record<string, unknown>).name;
          if (typeof name === "string") return [name];
        }
        return [];
      }

      const record = obj as Record<string, unknown>;
      if (currentProp in record) {
        return searchSchema(record[currentProp], remainingProps);
      }

      return [];
    };

    try {
      const results = searchSchema(data, path.split("."));
      if (results.length > 0) {
        // Deduplicate and join
        const unique = [...new Set(results.filter(Boolean))];
        return unique.length > 0 ? unique.join(", ") : defaultValue;
      }
    } catch (e) {
      parseLog.warn("metadata:schema-property-error", { path, error: String(e) });
    }

    return defaultValue;
  }

  /**
   * Extract title with fallback chain
   */
  private static getTitle(
    doc: LinkedomDocument,
    schemaOrgData: Record<string, unknown> | null,
    metaTags: MetaTagItem[],
  ): string | null {
    const rawTitle =
      this.getMetaContent(metaTags, "property", "og:title") ||
      this.getMetaContent(metaTags, "name", "twitter:title") ||
      this.getSchemaProperty(schemaOrgData, "headline") ||
      this.getSchemaProperty(schemaOrgData, "name") ||
      this.getMetaContent(metaTags, "name", "title") ||
      doc.querySelector("title")?.textContent?.trim() ||
      null;

    if (!rawTitle) return null;

    // Clean title by removing site name suffix
    const siteName = this.getSiteName(doc, schemaOrgData, metaTags);
    return this.cleanTitle(rawTitle, siteName);
  }

  /**
   * Remove site name from title (e.g., "Article Title | Site Name" → "Article Title")
   */
  private static cleanTitle(title: string, siteName: string | null): string {
    if (!title || !siteName) return title;

    const siteNameEscaped = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      `\\s*[|\\-–—:]\\s*${siteNameEscaped}\\s*$`, // Title | Site Name
      `^\\s*${siteNameEscaped}\\s*[|\\-–—:]\\s*`, // Site Name | Title
    ];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, "i");
      if (regex.test(title)) {
        return title.replace(regex, "").trim();
      }
    }

    return title.trim();
  }

  /**
   * Extract author with fallback chain
   */
  private static getAuthor(
    doc: LinkedomDocument,
    schemaOrgData: Record<string, unknown> | null,
    metaTags: MetaTagItem[],
  ): string | null {
    // 1. Meta tags
    let author =
      this.getMetaContent(metaTags, "name", "author") ||
      this.getMetaContent(metaTags, "property", "author") ||
      this.getMetaContent(metaTags, "property", "article:author") ||
      this.getMetaContent(metaTags, "name", "byl") ||
      this.getMetaContent(metaTags, "name", "sailthru.author");

    if (author) return author;

    // 2. Schema.org
    author = this.getSchemaProperty(schemaOrgData, "author.name") || this.getSchemaProperty(schemaOrgData, "author");

    if (author) {
      // Deduplicate if multiple authors
      const parts = author
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean);
      const unique = [...new Set(parts)];
      if (unique.length > 10) {
        return unique.slice(0, 10).join(", ");
      }
      return unique.join(", ");
    }

    // 3. DOM elements
    const authorSelectors = ['[itemprop="author"]', '[rel="author"]', ".author-name", ".byline-name", ".post-author"];

    for (const selector of authorSelectors) {
      const el = doc.querySelector(selector);
      if (el?.textContent) {
        const text = el.textContent.trim();
        if (text && text.toLowerCase() !== "author") {
          return text;
        }
      }
    }

    // 4. Twitter creator as last resort
    return this.getMetaContent(metaTags, "name", "twitter:creator");
  }

  /**
   * Extract publish date with fallback chain
   */
  private static getPublished(
    doc: LinkedomDocument,
    schemaOrgData: Record<string, unknown> | null,
    metaTags: MetaTagItem[],
  ): string | null {
    return (
      this.getSchemaProperty(schemaOrgData, "datePublished") ||
      this.getMetaContent(metaTags, "property", "article:published_time") ||
      this.getMetaContent(metaTags, "name", "publishDate") ||
      this.getMetaContent(metaTags, "name", "date") ||
      this.getMetaContent(metaTags, "name", "sailthru.date") ||
      this.getTimeElement(doc) ||
      null
    );
  }

  /**
   * Extract modification date
   */
  private static getModified(schemaOrgData: Record<string, unknown> | null, metaTags: MetaTagItem[]): string | null {
    return (
      this.getSchemaProperty(schemaOrgData, "dateModified") ||
      this.getMetaContent(metaTags, "property", "article:modified_time") ||
      null
    );
  }

  /**
   * Extract site name with fallback chain
   */
  private static getSiteName(
    doc: LinkedomDocument,
    schemaOrgData: Record<string, unknown> | null,
    metaTags: MetaTagItem[],
  ): string | null {
    return (
      this.getMetaContent(metaTags, "property", "og:site_name") ||
      this.getSchemaProperty(schemaOrgData, "publisher.name") ||
      this.getSchemaProperty(schemaOrgData, "isPartOf.name") ||
      this.getMetaContent(metaTags, "name", "application-name") ||
      this.getMetaContent(metaTags, "name", "twitter:site") ||
      null
    );
  }

  /**
   * Extract description with fallback chain
   */
  private static getDescription(schemaOrgData: Record<string, unknown> | null, metaTags: MetaTagItem[]): string | null {
    return (
      this.getMetaContent(metaTags, "name", "description") ||
      this.getMetaContent(metaTags, "property", "og:description") ||
      this.getSchemaProperty(schemaOrgData, "description") ||
      this.getMetaContent(metaTags, "name", "twitter:description") ||
      null
    );
  }

  /**
   * Extract image with fallback chain
   */
  private static getImage(schemaOrgData: Record<string, unknown> | null, metaTags: MetaTagItem[]): string | null {
    return (
      this.getMetaContent(metaTags, "property", "og:image") ||
      this.getMetaContent(metaTags, "name", "twitter:image") ||
      this.getSchemaProperty(schemaOrgData, "image.url") ||
      this.getSchemaProperty(schemaOrgData, "image") ||
      this.getSchemaProperty(schemaOrgData, "thumbnailUrl") ||
      null
    );
  }

  /**
   * Extract favicon URL
   */
  private static getFavicon(doc: LinkedomDocument, baseUrl: string): string | null {
    const iconLink =
      doc.querySelector('link[rel="icon"]')?.getAttribute("href") ||
      doc.querySelector('link[rel="shortcut icon"]')?.getAttribute("href") ||
      doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute("href");

    if (iconLink) {
      // Make absolute if relative
      if (baseUrl && !iconLink.startsWith("http")) {
        try {
          return new URL(iconLink, baseUrl).href;
        } catch {
          return iconLink;
        }
      }
      return iconLink;
    }

    // Default to /favicon.ico
    if (baseUrl) {
      try {
        return new URL("/favicon.ico", baseUrl).href;
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Extract date from time element
   */
  private static getTimeElement(doc: LinkedomDocument): string | null {
    const timeEl = doc.querySelector("time[datetime]");
    if (timeEl) {
      return timeEl.getAttribute("datetime")?.trim() || timeEl.textContent?.trim() || null;
    }
    return null;
  }
}

/**
 * Convenience function to extract metadata from HTML string
 */
export function extractMetadata(html: string, url: string): ExtractedMetadata {
  const { document } = parseHTML(html);
  return MetadataExtractor.extract(document, url);
}
