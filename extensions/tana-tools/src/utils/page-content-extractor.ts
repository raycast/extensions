import { BrowserExtension } from "@raycast/api";
import TurndownService from "turndown";
import {
  formatForTana as formatForTanaUnified,
  TanaFormatOptions,
  formatForTanaMarkdown as formatForTanaMarkdownUnified,
  PageInfo,
} from "./tana-formatter";

/**
 * Shared utilities for page content extraction and processing
 */

// Re-export PageInfo for backward compatibility
export type { PageInfo };

/**
 * Timeout wrapper for Browser Extension API calls
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 8000,
  operation: string = "operation",
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    return result;
  } catch (error) {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
    throw error;
  }
}

/**
 * Get active tab content and metadata using the most reliable approach
 * Uses getContent() without tabId to target the focused window's active tab
 */
export async function getActiveTabContent(): Promise<{
  content: string;
  tabInfo: { id: number; url: string; title: string };
  metadata: Partial<PageInfo>;
}> {
  try {
    console.log("🔍 Getting content from active tab of focused window...");

    // Step 1: Get title from focused tab to identify it
    const focusedTabTitle = await withTimeout(
      BrowserExtension.getContent({
        format: "text",
        cssSelector: "title",
      }),
      3000,
      "Getting focused tab title",
    ).catch(() => "");

    console.log(`🔍 Focused tab title: "${focusedTabTitle}"`);

    // Step 2: Get all tabs and find the one that matches our focused tab
    const tabs = await withTimeout(
      BrowserExtension.getTabs(),
      6000,
      "Getting browser tabs",
    );

    if (!tabs || tabs.length === 0) {
      throw new Error("Could not access browser tabs");
    }

    // Find the tab that matches our focused tab title
    let targetTab = tabs.find((tab) => tab.title === focusedTabTitle);

    if (!targetTab) {
      // Fallback: try partial match
      targetTab = tabs.find(
        (tab) =>
          tab.title &&
          focusedTabTitle &&
          (tab.title.includes(focusedTabTitle.substring(0, 10)) ||
            focusedTabTitle.includes(tab.title.substring(0, 10))),
      );
    }

    if (!targetTab) {
      // Last fallback: use the most recent tab (highest ID)
      const sortedTabs = [...tabs].sort((a, b) => b.id - a.id);
      targetTab = sortedTabs[0];
    }

    if (!targetTab) {
      throw new Error("Could not identify target tab");
    }

    console.log(
      `✅ Target tab identified: "${targetTab.title}" - ${targetTab.url}`,
    );

    // Step 3: Use the EXACT same approach as tab selection - extractMainContent + extractPageMetadata
    const [content, metadata] = await Promise.all([
      extractMainContent(targetTab.id, targetTab.url),
      extractPageMetadata(targetTab.id, targetTab.url, targetTab.title),
    ]);

    return {
      content,
      tabInfo: {
        id: targetTab.id,
        url: metadata.url || targetTab.url,
        title: metadata.title || targetTab.title || "Untitled",
      },
      metadata,
    };
  } catch (error) {
    console.log(`❌ Active tab content extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Extract page metadata using targeted selectors
 */
export async function extractPageMetadata(
  tabId: number,
  tabUrl: string,
  tabTitle?: string,
): Promise<Partial<PageInfo>> {
  try {
    console.log(`🔍 Extracting metadata from tab ${tabId}...`);

    // Extract title - prioritize clean title over tab title
    let title = "Web Page";
    if (tabTitle && tabTitle.trim().length > 0) {
      title = tabTitle.trim();
      console.log(`✅ Using tab title: "${title}"`);
    }

    // Try to get a cleaner title from the page
    try {
      const pageTitle = await withTimeout(
        BrowserExtension.getContent({
          format: "text",
          cssSelector: "title",
          tabId: tabId,
        }),
        3000,
        "Getting page title",
      );

      if (
        pageTitle &&
        pageTitle.trim().length > 0 &&
        pageTitle.trim() !== title
      ) {
        title = pageTitle.trim();
        console.log(`✅ Found cleaner title: "${title}"`);
      }
    } catch (error) {
      console.log(`❌ Could not extract page title: ${error}`);
    }

    // Extract description - try multiple selectors and methods
    let description: string | undefined;
    const descriptionSelectors = [
      'meta[name="description"]',
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
    ];

    for (const selector of descriptionSelectors) {
      try {
        // Try to get the content attribute
        const metaDescription = await withTimeout(
          BrowserExtension.getContent({
            format: "html",
            cssSelector: selector,
            tabId: tabId,
          }),
          3000,
          `Getting meta description via ${selector}`,
        );

        if (metaDescription && metaDescription.trim().length > 0) {
          // Extract content attribute from the meta tag HTML
          const contentMatch = metaDescription.match(
            /content=["']([^"']+)["']/i,
          );
          if (contentMatch && contentMatch[1]) {
            description = contentMatch[1].trim();
            console.log(
              `✅ Found description via ${selector}: "${description.substring(0, 50)}..."`,
            );
            break;
          }
        }
      } catch (error) {
        console.log(`❌ Selector ${selector} failed: ${error}`);
        continue;
      }
    }

    // Extract author
    let author: string | undefined;
    const authorSelectors = [
      'meta[name="author"]',
      'meta[property="article:author"]',
      '[rel="author"]',
      ".author",
      ".byline",
    ];

    for (const selector of authorSelectors) {
      try {
        const authorElement = await withTimeout(
          BrowserExtension.getContent({
            format: "text",
            cssSelector: selector,
            tabId: tabId,
          }),
          2000,
          `Getting author via ${selector}`,
        );

        if (
          authorElement &&
          authorElement.trim().length > 0 &&
          authorElement.trim().length < 100
        ) {
          author = authorElement.trim();
          console.log(
            `✅ Found author: "${author}" using selector: ${selector}`,
          );
          break;
        }
      } catch (error) {
        console.log(`❌ Author selector ${selector} failed: ${error}`);
        continue;
      }
    }

    return {
      title,
      url: tabUrl,
      description,
      author,
    };
  } catch (error) {
    console.log(`❌ Metadata extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Convert relative URLs to absolute URLs
 */
export function makeAbsoluteUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    // Relative to domain root
    const urlObj = new URL(baseUrl);
    return `${urlObj.protocol}//${urlObj.host}${url}`;
  }

  // Relative to current path
  return new URL(url, baseUrl).href;
}

/**
 * Helper function to process broken link patterns across multiple lines
 *
 * Handles markdown links that have been split across lines by content extraction,
 * where the link text and URL appear on separate lines. Reconstructs proper
 * markdown links and converts relative URLs to absolute URLs when possible.
 *
 * @param lines - Array of all content lines
 * @param startIndex - Index of the line containing the opening bracket
 * @param baseUrl - Base URL for converting relative links to absolute
 * @returns Object containing number of lines consumed and the processed output
 */
function processBrokenLink(
  lines: string[],
  startIndex: number,
  baseUrl: string,
): { linesConsumed: number; output: string } {
  const startLine = lines[startIndex];
  const baseIndent = startLine.match(/^(\s*)/)?.[1] || "";

  let linkText = "";
  let linkUrl = "";
  let linesConsumed = 1; // Start with the current line

  // Look ahead to collect link text and URL
  for (let j = startIndex + 1; j < lines.length; j++) {
    const nextLine = lines[j].trim();

    // Check if this line contains the URL part: ](url)
    const urlMatch = nextLine.match(/^]\(([^)]+)\)(.*)$/);
    if (urlMatch) {
      linkUrl = urlMatch[1];
      const remaining = urlMatch[2].trim();
      linesConsumed = j - startIndex + 1;

      if (linkText.trim() && linkUrl.trim()) {
        // Convert relative URLs to absolute URLs if we have a base URL
        const absoluteUrl = baseUrl
          ? makeAbsoluteUrl(linkUrl, baseUrl)
          : linkUrl;
        // Format for Tana: Text [URL](URL)
        return {
          linesConsumed,
          output: `${baseIndent}- ${linkText.trim()} [${absoluteUrl}](${absoluteUrl})${remaining ? " " + remaining : ""}`,
        };
      } else {
        // If we can't form a proper link, just add the text
        return {
          linesConsumed,
          output: `${baseIndent}- ${linkText.trim()}${remaining ? " " + remaining : ""}`,
        };
      }
    } else {
      // Accumulate link text
      linkText = linkText ? linkText + " " + nextLine : nextLine;
    }
  }

  // If we couldn't complete the link, just return the original line
  return {
    linesConsumed: 1,
    output: startLine,
  };
}

/**
 * Fix broken markdown links and convert to Tana-clickable format
 */
export function fixBrokenLinks(content: string, baseUrl: string = ""): string {
  const lines = content.split("\n");
  const result: string[] = [];

  for (let idx = 0; idx < lines.length; ) {
    const line = lines[idx].trim();

    // Check for start of a broken link pattern: line ending with just "["
    if (line === "[" || line.endsWith("- [")) {
      const { linesConsumed, output } = processBrokenLink(lines, idx, baseUrl);
      result.push(output);
      idx += linesConsumed;
    } else {
      // Regular line, just add it
      result.push(lines[idx]);
      idx += 1;
    }
  }

  return result.join("\n");
}

/**
 * Clean content to prevent accidental Tana field creation and other issues
 */
export function cleanContentForTana(
  content: string,
  baseUrl: string = "",
): string {
  // First fix broken links
  let cleanedContent = fixBrokenLinks(content, baseUrl);

  // Then apply other cleaning
  cleanedContent = cleanedContent
    .split("\n")
    .map((line) => {
      const cleanLine = line.trim();

      // Skip empty lines
      if (!cleanLine) return line;

      // Remove javascript:void references that might have been missed
      if (cleanLine.includes("javascript:void")) {
        return "";
      }

      // Remove image references (both !Image url and ![](url) formats)
      if (cleanLine.match(/^!.*https?:\/\//)) {
        return "";
      }

      // Note: :: escaping is now handled earlier in the pipeline
      // This section is kept for other content cleaning

      return line;
    })
    .filter((line) => line.trim().length > 0 || line === "") // Keep structure but remove completely empty content
    .join("\n");

  return cleanedContent;
}

/**
 * Extract main content using Raycast's reader mode
 */
export async function extractMainContent(
  tabId: number,
  pageUrl: string = "",
): Promise<string> {
  try {
    console.log(
      `🔍 Extracting main content using reader mode from tab ${tabId}...`,
    );

    // Try to get markdown first
    let content = await withTimeout(
      BrowserExtension.getContent({
        format: "markdown",
        tabId: tabId,
      }),
      10000,
      "Getting content via reader mode",
    );

    if (!content || content.trim().length === 0) {
      throw new Error("No content extracted from page");
    }

    // If the content looks like HTML (starts with < or contains HTML tags), convert it to markdown
    if (content.trim().startsWith("<") || /<[^>]+>/.test(content)) {
      console.log("⚠️ Content appears to be HTML, converting to markdown...");

      // Initialize Turndown service with optimized settings
      const turndownService = new TurndownService({
        headingStyle: "atx",
        hr: "---",
        bulletListMarker: "-",
        codeBlockStyle: "fenced",
        fence: "```",
        emDelimiter: "*",
        strongDelimiter: "**",
        linkStyle: "inlined",
        linkReferenceStyle: "full",
      });

      // Remove unwanted elements before conversion
      turndownService.remove(["script", "style", "meta", "link", "noscript"]);

      // Add custom rule to remove SVG elements
      turndownService.addRule("removeSvg", {
        filter: (node: Element) =>
          node.nodeName.toUpperCase() === "SVG" ||
          node.nodeName.toUpperCase() === "PATH",
        replacement: () => "",
      });

      // Add custom rule to filter out javascript:void links and unwanted links
      turndownService.addRule("filterBadLinks", {
        filter: (node: Element) => {
          if (node.nodeName === "A") {
            const href = node.getAttribute("href") || "";
            const text = (node.textContent || "").trim();

            // Filter out javascript:void links
            if (href.includes("javascript:void")) {
              return true;
            }

            // Filter out generic "close" links
            if (text.toLowerCase() === "close" && href.includes("javascript")) {
              return true;
            }

            // Filter out empty or meaningless links
            if (text.length === 0 || href === "#" || href === "") {
              return true;
            }
          }
          return false;
        },
        replacement: () => "",
      });

      // Add custom rule to convert tables to proper markdown table format for Tana Paste
      turndownService.addRule("tablesAsMarkdown", {
        filter: "table",
        replacement: (_content: string, node: Node) => {
          // Type guard and cast to any to work with DOM methods
          if (
            !node ||
            typeof node !== "object" ||
            !("querySelectorAll" in node)
          )
            return "";
          const element = node as HTMLTableElement;

          const rows = Array.from(element.querySelectorAll("tr"));
          if (rows.length === 0) return "";

          const result: string[] = [];

          // Process all rows to build markdown table
          let headers: string[] = [];
          let hasHeaderRow = false;

          rows.forEach((row: HTMLTableRowElement) => {
            const cells = Array.from(row.querySelectorAll("td, th"));
            const cellContents = cells.map((cell: Element) =>
              (cell.textContent || "").trim(),
            );

            // Skip completely empty rows
            if (cellContents.every((content) => content.length === 0)) {
              return;
            }

            // Check if this row contains header cells (th elements)
            const isHeaderRow =
              Array.from(row.querySelectorAll("th")).length > 0 ||
              row.closest("thead") !== null;

            if (isHeaderRow && !hasHeaderRow) {
              // This is the header row
              headers = cellContents.filter((content) => content.length > 0);
              if (headers.length > 0) {
                result.push(`| ${headers.join(" | ")} |`);
                result.push(`| ${headers.map(() => "---").join(" | ")} |`);
                hasHeaderRow = true;
              }
            } else {
              // This is a data row
              const dataCells = cellContents.map((content) => content || " ");

              // If we don't have headers yet, create generic ones
              if (!hasHeaderRow && dataCells.length > 0) {
                headers = dataCells.map((_, index) => `Column ${index + 1}`);
                result.push(`| ${headers.join(" | ")} |`);
                result.push(`| ${headers.map(() => "---").join(" | ")} |`);
                hasHeaderRow = true;
              }

              // Add the data row
              if (dataCells.length > 0) {
                // Pad row to match header length if needed
                while (dataCells.length < headers.length) {
                  dataCells.push(" ");
                }
                result.push(`| ${dataCells.join(" | ")} |`);
              }
            }
          });

          return result.length > 0 ? "\n" + result.join("\n") + "\n" : "";
        },
      });

      // Convert HTML to markdown
      content = turndownService.turndown(content);
      console.log(`✅ Converted HTML to markdown`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error("No content extracted after processing");
    }

    // Unescape Raycast's escaped markdown syntax
    content = unescapeRaycastMarkdown(content);

    // Clean up content to prevent accidental field creation
    content = cleanContentForTana(content, pageUrl);

    console.log(`✅ Extracted ${content.length} characters of clean content`);
    return content.trim();
  } catch (error) {
    console.log(`❌ Content extraction failed: ${error}`);
    throw error;
  }
}

/**
 * Convert Tana format to use headings as parent nodes instead of !! headings
 * This processes the final Tana output to convert headings to regular parent nodes
 * and ensures all content stays properly nested under the Content:: field
 */
export function convertTanaHeadersToParentNodes(tanaText: string): string {
  const lines = tanaText.split("\n");
  const result: string[] = [];
  let insideContentField = false;
  let contentFieldBaseIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're entering the Content:: field
    if (line.includes("Content::")) {
      insideContentField = true;
      contentFieldBaseIndent = (line.match(/^(\s*)/)?.[1]?.length || 0) + 2; // Base indent + 2 for field content
      result.push(line);
      continue;
    }

    // Check if we're exiting the Content:: field (line with same or less indentation than Content:: field)
    if (insideContentField) {
      const currentIndent = line.match(/^(\s*)/)?.[1]?.length || 0;
      const contentFieldIndent = contentFieldBaseIndent - 2; // The Content:: field itself indentation

      if (
        currentIndent <= contentFieldIndent &&
        line.trim().length > 0 &&
        !line.trim().startsWith("-")
      ) {
        insideContentField = false;
      }
    }

    if (insideContentField && line.trim().length > 0) {
      // Ensure content lines have proper indentation under Content:: field
      const currentIndent = line.match(/^(\s*)/)?.[1]?.length || 0;
      const minRequiredIndent = contentFieldBaseIndent;

      let processedLine = line;

      // Convert Tana headings to regular parent nodes
      const headingMatch = line.match(/^(\s*)- !! (.+)$/);
      if (headingMatch) {
        const [, indentation, headingText] = headingMatch;
        processedLine = `${indentation}- ${headingText}`;
      }

      // Ensure minimum indentation for content field
      if (currentIndent < minRequiredIndent) {
        const additionalSpaces = " ".repeat(minRequiredIndent - currentIndent);
        processedLine = additionalSpaces + processedLine;
      }

      result.push(processedLine);
    } else {
      // Convert headings outside content field
      const headingMatch = line.match(/^(\s*)- !! (.+)$/);
      if (headingMatch) {
        const [, indentation, headingText] = headingMatch;
        result.push(`${indentation}- ${headingText}`);
      } else {
        result.push(line);
      }
    }
  }

  return result.join("\n");
}

/**
 * Remove :: in content to prevent field creation (apply BEFORE Tana conversion)
 */
export function removeColonsInContent(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      // Remove all :: to prevent any field creation in content
      return line.replace(/::/g, ":");
    })
    .join("\n");
}

/**
 * Unescape Raycast's escaped markdown syntax to get proper markdown
 */
export function unescapeRaycastMarkdown(content: string): string {
  return content
    .split("\n")
    .map((line) => {
      let unescapedLine = line;

      // Unescape headings: \# -> #
      unescapedLine = unescapedLine.replace(/\\#/g, "#");

      // Unescape other common markdown escapes
      unescapedLine = unescapedLine.replace(/\\\*/g, "*");
      unescapedLine = unescapedLine.replace(/\\_/g, "_");
      unescapedLine = unescapedLine.replace(/\\\[/g, "[");
      unescapedLine = unescapedLine.replace(/\\\]/g, "]");
      unescapedLine = unescapedLine.replace(/\\\./g, ".");

      // Note: Don't convert numbered sections here - TurndownService already handles <h2> -> ## conversion
      // We were double-processing and breaking the proper headings

      return unescapedLine;
    })
    .join("\n");
}

/**
 * General Tana formatting utility with user preference support
 *
 * Main entry point for converting various content types to Tana Paste format.
 * Automatically detects content type and applies appropriate formatting with
 * support for user-customized tags, field names, and content inclusion preferences.
 *
 * @param options - Formatting configuration object
 * @param options.title - Content title
 * @param options.url - Content URL
 * @param options.description - Content description
 * @param options.author - Content author/creator
 * @param options.content - Main content text
 * @param options.lines - Alternative content as array of lines
 * @param options.useSwipeTag - Legacy option for swipe tag (deprecated)
 * @param options.videoTag - Custom tag for video content
 * @param options.articleTag - Custom tag for article content
 * @param options.transcriptTag - Custom tag for transcript content
 * @param options.noteTag - Custom tag for note content
 * @param options.urlField - Custom field name for URLs
 * @param options.authorField - Custom field name for authors
 * @param options.transcriptField - Custom field name for transcripts
 * @param options.contentField - Custom field name for main content
 * @param options.includeAuthor - Whether to include author field
 * @param options.includeDescription - Whether to include description field
 * @returns Formatted Tana Paste string ready for clipboard
 */
export function formatForTana(options: {
  title?: string;
  url?: string;
  description?: string;
  author?: string;
  content?: string;
  lines?: string[];
  useSwipeTag?: boolean;
  videoTag?: string;
  articleTag?: string;
  transcriptTag?: string;
  noteTag?: string;
  urlField?: string;
  authorField?: string;
  transcriptField?: string;
  contentField?: string;
  includeAuthor?: boolean;
  includeDescription?: boolean;
}): string {
  // Convert to unified formatter options
  const tanaOptions: TanaFormatOptions = {
    title: options.title,
    url: options.url,
    description: options.description,
    author: options.author,
    content: options.content,
    lines: options.lines,
    useSwipeTag: options.useSwipeTag,
    videoTag: options.videoTag,
    articleTag: options.articleTag,
    transcriptTag: options.transcriptTag,
    noteTag: options.noteTag,
    urlField: options.urlField,
    authorField: options.authorField,
    transcriptField: options.transcriptField,
    contentField: options.contentField,
    includeAuthor: options.includeAuthor,
    includeDescription: options.includeDescription,
  };

  return formatForTanaUnified(tanaOptions);
}

/**
 * Format page info for Tana in structured format (legacy wrapper)
 */
export function formatForTanaMarkdown(pageInfo: PageInfo): string {
  return formatForTanaMarkdownUnified(pageInfo);
}
