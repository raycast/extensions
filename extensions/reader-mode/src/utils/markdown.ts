import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { parseLog } from "./logger";

// Initialize Turndown with sensible defaults
const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*",
  strongDelimiter: "**",
  linkStyle: "inlined",
});

// Enable GitHub Flavored Markdown (tables, strikethrough, task lists)
turndown.use(gfm);

// Custom rule to handle bracketed text in emphasis/italic tags
// Prevents "[text]" from being converted to "*[text]*" which can cause formatting issues
turndown.addRule("bracketedEmphasis", {
  filter: ["em", "i"],
  replacement: function (content) {
    // If content starts with [ and ends with ], don't apply emphasis
    if (content.trim().startsWith("[") && content.trim().endsWith("]")) {
      return content;
    }
    // Otherwise, apply normal emphasis
    return "*" + content + "*";
  },
});

// Remove unwanted elements that may slip through Readability
// Based on Safari Reader Mode and Reader View patterns
turndown.remove([
  "script",
  "style",
  "noscript",
  "iframe",
  "form",
  "button",
  "input",
  "select",
  "textarea",
  "aside",
  "nav",
]);

// Custom rule to filter elements by role attribute
turndown.addRule("removeByRole", {
  filter: (node) => {
    const role = node.getAttribute?.("role");
    return role === "complementary" || role === "navigation";
  },
  replacement: () => "",
});

// Custom rule to handle linked images (images wrapped in anchor tags)
// Converts [![](img)](link) to just ![](img) to avoid errant brackets
turndown.addRule("linkedImages", {
  filter: (node: HTMLElement) => {
    return (
      node.nodeName === "A" &&
      node.childNodes.length > 0 &&
      Array.from(node.childNodes).some((child) => {
        if (child.nodeName === "IMG") return true;
        // Check if any child element contains an img
        if (child.nodeType === 1) {
          return (child as HTMLElement).querySelector("img") !== null;
        }
        return false;
      })
    );
  },
  replacement: (content) => {
    // Return just the image content without the link wrapper
    return content;
  },
});

// Custom rule to italicize figcaption content (image captions)
// Handles multiline captions by wrapping each line in italics
turndown.addRule("figcaption", {
  filter: "figcaption",
  replacement: (content) => {
    const trimmed = content.trim();
    if (!trimmed) return "";
    // Split by newlines and wrap each non-empty line in italics
    const lines = trimmed.split(/\n+/).filter((line) => line.trim());
    const italicized = lines.map((line) => `*${line.trim()}*`).join("\n\n");
    return `\n\n${italicized}\n\n`;
  },
});

/**
 * Converts HTML content to Markdown
 */
export function htmlToMarkdown(html: string): { success: true; markdown: string } | { success: false; error: string } {
  parseLog.log("parse:markdown:start", { htmlLength: html.length });

  try {
    let markdown = turndown.turndown(html);

    // Post-process: Simplify image syntax to fix Raycast rendering issues
    // Remove alt text and title attributes, keeping just the image URL
    // IMPORTANT: Do this BEFORE bracket replacement to avoid breaking image syntax

    // First, handle images with title attributes (including multiline and escaped quotes)
    // Match ![...](url "...") where title may contain escaped quotes and newlines
    markdown = markdown.replace(/!\[[^\]]*\]\(([^\s)]+)\s+".+?"\)/gs, "![]($1)");

    // Then handle regular images without titles
    markdown = markdown.replace(/!\[[^\]]*\]\(([^\s)]+)\)/g, "![]($1)");

    // Post-process: Replace standalone square brackets that are NOT part of markdown links or images
    // to prevent Raycast's markdown renderer from interpreting them as LaTeX math
    // Convert [text] to (text) - parentheses are also standard for editorial insertions
    // The negative lookahead (?!\() ensures we don't match [text]( which is part of a link
    markdown = markdown.replace(/\[([^\]]+)\](?!\()/g, "($1)");

    // Count headings for logging
    const headingCount = (markdown.match(/^#{1,6}\s/gm) || []).length;

    parseLog.log("parse:markdown:success", {
      markdownLength: markdown.length,
      headingCount,
    });

    return { success: true, markdown };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown conversion error";
    parseLog.error("parse:markdown:error", { error: message });
    return { success: false, error: message };
  }
}

export interface FormattedArticle {
  markdown: string;
  title: string;
}

export interface ArchiveAnnotation {
  /** Which service provided the content */
  service: "googlebot" | "bingbot" | "social-referrer" | "wallhopper" | "archive.is" | "wayback" | "browser" | "none";
  /** URL of the archived version (if applicable) */
  url?: string;
  /** Timestamp of the archived version */
  timestamp?: string;
}

export interface FormatArticleOptions {
  /** Image URL to prepend at the top of the article */
  image?: string | null;
  /** Archive source annotation to display */
  archiveSource?: ArchiveAnnotation;
}

/**
 * Extracts the base image identifier from a URL, stripping size/dimension parameters.
 * This helps match the same image served at different sizes (common with CDNs).
 *
 * Examples:
 * - Le Monde: /119/0/5000/3333/1440/960/60/0/df2f706_... → df2f706_...
 * - Generic CDN: image.jpg?w=800&h=600 → image.jpg
 */
function getImageIdentifier(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;

    // Extract the filename (last path segment)
    const filename = pathname.split("/").pop() || pathname;

    // For URLs with query params (e.g., ?w=800&h=600), strip them
    // The pathname already excludes query params, so just return filename
    return filename.toLowerCase();
  } catch {
    // If URL parsing fails, try to extract filename from the string
    const match = url.match(/\/([^/?]+)(?:\?|$)/);
    return (match?.[1] || url).toLowerCase();
  }
}

/**
 * Removes duplicate images from markdown content that match the featured article image.
 * This prevents the same image from appearing twice when the article image is prepended.
 *
 * @param markdown - The markdown content to process
 * @param articleImageUrl - The featured image URL that will be prepended
 * @returns The markdown with duplicate images removed
 */
export function dedupeArticleImage(markdown: string, articleImageUrl: string): string {
  const articleImageId = getImageIdentifier(articleImageUrl);

  // Match markdown image syntax: ![alt](url) or ![](url)
  const imageRegex = /!\[[^\]]*\]\(([^)]+)\)/g;

  // Track if we've removed any images (for logging)
  let removedCount = 0;

  const result = markdown.replace(imageRegex, (match, imageUrl) => {
    const contentImageId = getImageIdentifier(imageUrl);

    // If the image identifiers match, this is a duplicate - remove it
    if (contentImageId === articleImageId) {
      removedCount++;
      // Return empty string to remove the image, but preserve any surrounding whitespace handling
      return "";
    }

    return match;
  });

  if (removedCount > 0) {
    parseLog.log("markdown:dedupe-images", {
      articleImageId,
      removedCount,
    });
  }

  // Clean up any double newlines left by removed images
  return result.replace(/\n{3,}/g, "\n\n");
}

/**
 * Formats article content into Markdown (body only, no title/metadata)
 * Title and metadata are now handled in the component to avoid duplication
 */
export function formatArticle(title: string, content: string, options?: FormatArticleOptions): FormattedArticle {
  // Convert HTML content to Markdown
  const result = htmlToMarkdown(content);
  let contentMarkdown = result.success ? result.markdown : content;

  // Prepend article image if available from metadata (OG/Twitter Card)
  if (options?.image) {
    // First, remove any duplicate images from the content that match the article image
    contentMarkdown = dedupeArticleImage(contentMarkdown, options.image);
    // Then prepend the article image
    contentMarkdown = `![](${options.image})\n\n${contentMarkdown}`;
  }

  // Return just the body content - title and metadata will be added by the component
  return {
    markdown: contentMarkdown,
    title,
  };
}
