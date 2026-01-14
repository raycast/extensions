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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: (node: any) => {
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
 * Formats article content into Markdown (body only, no title/metadata)
 * Title and metadata are now handled in the component to avoid duplication
 */
export function formatArticle(title: string, content: string, options?: FormatArticleOptions): FormattedArticle {
  // Convert HTML content to Markdown
  const result = htmlToMarkdown(content);
  let contentMarkdown = result.success ? result.markdown : content;

  // Prepend article image if available from metadata (OG/Twitter Card)
  if (options?.image) {
    contentMarkdown = `![](${options.image})\n\n${contentMarkdown}`;
  }

  // Return just the body content - title and metadata will be added by the component
  return {
    markdown: contentMarkdown,
    title,
  };
}
