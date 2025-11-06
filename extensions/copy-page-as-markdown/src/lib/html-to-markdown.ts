import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

/**
 * Cleans HTML by removing scripts, styles, and other non-content elements
 * Based on Firecrawl's HTML cleaning approach
 */
function cleanHtml(html: string): string {
  // Remove script tags and their contents
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove style tags and their contents
  html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");

  // Remove noscript tags and their contents
  html = html.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

  // Remove meta and head tags
  html = html.replace(/<meta\b[^>]*>/gi, "");
  html = html.replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, "");

  // Remove HTML comments
  html = html.replace(/<!--[\s\S]*?-->/g, "");

  // Remove common non-content elements
  const nonContentSelectors = [
    // Navigation
    /<header\b[^>]*>[\s\S]*?<\/header>/gi,
    /<footer\b[^>]*>[\s\S]*?<\/footer>/gi,
    /<nav\b[^>]*>[\s\S]*?<\/nav>/gi,
    /<aside\b[^>]*>[\s\S]*?<\/aside>/gi,
    // Forms (newsletter signups, etc.)
    /<form\b[^>]*>[\s\S]*?<\/form>/gi,
  ];

  nonContentSelectors.forEach((regex) => {
    html = html.replace(regex, "");
  });

  // Remove button elements (copy buttons, etc.)
  html = html.replace(/<button\b[^>]*>[\s\S]*?<\/button>/gi, "");

  return html;
}

/**
 * Converts HTML to Markdown using Turndown with GitHub Flavored Markdown support
 * Based on Firecrawl's HTML to Markdown conversion logic
 */
export function convertHtmlToMarkdown(html: string): string {
  // Clean HTML before conversion
  html = cleanHtml(html);

  const turndownService = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  // Add GitHub Flavored Markdown plugin for tables, strikethrough, etc.
  turndownService.use(gfm);

  // Remove scripts, styles, and other non-content elements
  turndownService.remove(["script", "style", "noscript", "iframe", "object", "embed"]);

  // Custom rule for inline links to handle edge cases
  turndownService.addRule("inlineLink", {
    filter: function (node, options) {
      return options.linkStyle === "inlined" && node.nodeName === "A" && node.getAttribute("href") !== null;
    },
    replacement: function (content, node) {
      const href = (node as HTMLAnchorElement).getAttribute("href");
      const title = (node as HTMLAnchorElement).getAttribute("title");
      if (!href) return content;

      const titlePart = title ? ` "${title}"` : "";
      return `[${content}](${href}${titlePart})`;
    },
  });

  let markdown = turndownService.turndown(html);

  // Post-processing: handle multi-line links by escaping newlines
  markdown = processMultiLineLinks(markdown);

  // Post-processing: normalize excessive blank lines
  markdown = normalizeWhitespace(markdown);

  return markdown.trim();
}

/**
 * Processes markdown to handle links that span multiple lines
 * Escapes newlines within link text to keep them on one line
 * Uses Firecrawl's character-by-character approach to handle nested brackets
 * Skips code blocks to avoid corrupting code
 */
function processMultiLineLinks(markdown: string): string {
  let insideLinkContent = false;
  let insideCodeBlock = false;
  let insideInlineCode = false;
  let newMarkdown = "";
  let linkOpenCount = 0;

  for (let i = 0; i < markdown.length; i++) {
    const char = markdown[i];
    const nextTwo = markdown.substring(i, i + 3);
    const prevChar = i > 0 ? markdown[i - 1] : "";

    // Track code blocks (```)
    if (nextTwo === "```") {
      insideCodeBlock = !insideCodeBlock;
      newMarkdown += char;
      continue;
    }

    // Track inline code (`)
    if (char === "`" && prevChar !== "\\") {
      insideInlineCode = !insideInlineCode;
      newMarkdown += char;
      continue;
    }

    // Don't process anything inside code
    if (insideCodeBlock || insideInlineCode) {
      newMarkdown += char;
      continue;
    }

    // Track link brackets
    if (char === "[") {
      linkOpenCount++;
    } else if (char === "]") {
      linkOpenCount = Math.max(0, linkOpenCount - 1);
    }

    insideLinkContent = linkOpenCount > 0;

    // Escape newlines inside link text with backslash
    if (insideLinkContent && char === "\n") {
      newMarkdown += "\\" + "\n";
    } else {
      newMarkdown += char;
    }
  }

  return newMarkdown;
}

/**
 * Normalizes whitespace in markdown
 * Only fixes genuinely broken formatting, doesn't remove content
 */
function normalizeWhitespace(markdown: string): string {
  // Remove multiple consecutive blank lines (more than 2)
  markdown = markdown.replace(/\n{3,}/g, "\n\n");

  return markdown;
}
