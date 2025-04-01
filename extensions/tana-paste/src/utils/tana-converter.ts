/**
 * Represents different types of text elements that can be detected
 */
export type TextElement = {
  type: "text" | "url" | "email" | "lineBreak" | "listItem" | "header";
  content: string;
  level?: number;
};

interface Line {
  content: string;
  indent: number;
  raw: string;
  isHeader: boolean;
  isCodeBlock: boolean;
  parent?: number;
}

/**
 * Parse a line to determine its structure
 */
function parseLine(line: string): Line {
  const raw = line;

  // Calculate indent level based on spaces
  const match = line.match(/^(\s*)/);
  const spaces = match ? match[1].length : 0;
  const indent = Math.floor(spaces / 2);

  // Get content without indentation
  const content = line.slice(spaces).trimEnd();

  // Detect if it's a header
  const isHeader = content.startsWith("#");

  // Detect if it's a code block
  const isCodeBlock = content.startsWith("```");

  return { content, indent, raw, isHeader, isCodeBlock, parent: undefined };
}

/**
 * Build the hierarchy by linking lines to their parents
 *
 * Enhanced to properly nest headings based on their level (H1, H2, etc.)
 */
function buildHierarchy(lines: Line[]): Line[] {
  if (lines.length === 0) return lines;

  const result = [...lines];

  // Track the most recent header at each level
  // headersAtLevel[0] = H1, headersAtLevel[1] = H2, etc.
  const headersAtLevel: number[] = [];

  let lastParentAtLevel: number[] = [-1];
  let inCodeBlock = false;
  let codeBlockParent: number | undefined = undefined;

  for (let i = 0; i < result.length; i++) {
    const line = result[i];
    const content = line.content.trim();

    // Skip empty lines
    if (!content) continue;

    // Handle code blocks
    if (line.isCodeBlock || inCodeBlock) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockParent = lastParentAtLevel[lastParentAtLevel.length - 1];
      }
      line.parent = codeBlockParent;
      if (line.isCodeBlock && inCodeBlock) {
        inCodeBlock = false;
        codeBlockParent = undefined;
      }
      continue;
    }

    // Handle headers
    if (line.isHeader) {
      const level = content.match(/^#+/)?.[0].length ?? 1;

      // Find the parent for this header based on heading levels
      if (level === 1) {
        // Top-level (H1) headings are at the root
        line.parent = -1;
      } else {
        // Subheadings (H2+) are children of the most recent header one level up
        // For example, H2s are children of the most recent H1
        line.parent = headersAtLevel[level - 2] ?? -1;
      }

      // Update the header tracking for this level
      headersAtLevel[level - 1] = i;

      // Clear header tracking for all deeper levels
      // (when we see an H2, we clear tracked H3s, H4s, etc.)
      headersAtLevel.length = level;

      // Reset parent tracking at this level for content under this header
      lastParentAtLevel = lastParentAtLevel.slice(0, level + 1);
      lastParentAtLevel[level] = i;

      continue;
    }

    // Handle list items and content
    const effectiveIndent = line.indent;

    // Find the appropriate parent
    while (lastParentAtLevel.length > effectiveIndent + 1) {
      lastParentAtLevel.pop();
    }

    // Content is parented to the most recent element at the previous indentation level
    line.parent = lastParentAtLevel[effectiveIndent] ?? -1;

    // Update parent tracking at this level
    lastParentAtLevel[effectiveIndent + 1] = i;
  }

  return result;
}

interface ParsedDate {
  type: "simple" | "time" | "week" | "duration";
  value: string;
  isProcessed?: boolean;
}

/**
 * Parse a date string into its components
 */
function parseDate(text: string): ParsedDate | null {
  // Already a Tana date reference
  if (text.startsWith("[[date:") && text.endsWith("]]")) {
    return {
      type: "simple",
      value: text,
      isProcessed: true,
    };
  }

  // Week format
  const weekMatch = text.match(/^Week (\d{1,2}),\s*(\d{4})$/);
  if (weekMatch) {
    const [, week, year] = weekMatch;
    return {
      type: "week",
      value: `${year}-W${week.padStart(2, "0")}`,
    };
  }

  // Week range
  const weekRangeMatch = text.match(/^Weeks (\d{1,2})-(\d{1,2}),\s*(\d{4})$/);
  if (weekRangeMatch) {
    const [, week1, week2, year] = weekRangeMatch;
    return {
      type: "duration",
      value: `${year}-W${week1.padStart(2, "0")}/W${week2.padStart(2, "0")}`,
    };
  }

  // ISO date with time
  const isoTimeMatch = text.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})$/);
  if (isoTimeMatch) {
    const [, date, time] = isoTimeMatch;
    return {
      type: "time",
      value: `${date} ${time}`,
    };
  }

  // Legacy format with time
  const legacyTimeMatch = text.match(
    /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+)?([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})(?:,\s*(\d{1,2}):(\d{2})\s*(AM|PM))?$/,
  );
  if (legacyTimeMatch) {
    const [, month, day, year, hour, min, ampm] = legacyTimeMatch;
    if (hour && min && ampm) {
      const h = parseInt(hour);
      const adjustedHour =
        ampm === "PM" && h < 12 ? h + 12 : ampm === "AM" && h === 12 ? 0 : h;
      return {
        type: "time",
        value: `${year}-${getMonthNumber(month)}-${day.padStart(2, "0")} ${adjustedHour.toString().padStart(2, "0")}:${min}`,
      };
    }
    return {
      type: "simple",
      value: `${year}-${getMonthNumber(month)}-${day.padStart(2, "0")}`,
    };
  }

  // Duration with mixed formats
  const durationMatch = text.match(
    /^([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\s*-\s*([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,\s*(\d{4})$/,
  );
  if (durationMatch) {
    const [, month1, day1, month2, day2, year] = durationMatch;
    return {
      type: "duration",
      value: `${year}-${getMonthNumber(month1)}-${day1.padStart(2, "0")}/${year}-${getMonthNumber(month2)}-${day2.padStart(2, "0")}`,
    };
  }

  // ISO duration
  const isoDurationMatch = text.match(
    /^(\d{4}-\d{2}-\d{2})\/(\d{4}-\d{2}-\d{2})$/,
  );
  if (isoDurationMatch) {
    const [, start, end] = isoDurationMatch;
    return {
      type: "duration",
      value: `${start}/${end}`,
    };
  }

  // Simple ISO date
  const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (isoMatch) {
    return {
      type: "simple",
      value: isoMatch[1],
    };
  }

  // Month and year
  const monthYearMatch = text.match(
    /^(?:(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+)?([A-Z][a-z]+)(?:\s+)?(?:⌘\s+)?(\d{4})$/,
  );
  if (monthYearMatch) {
    const [, month, year] = monthYearMatch;
    return {
      type: "simple",
      value: `${year}-${getMonthNumber(month)}`,
    };
  }

  // Year only
  const yearMatch = text.match(/^(?:⌘\s+)?(\d{4})$/);
  if (yearMatch) {
    return {
      type: "simple",
      value: yearMatch[1],
    };
  }

  return null;
}

/**
 * Format a parsed date into Tana format
 */
function formatTanaDate(date: ParsedDate): string {
  if (date.isProcessed) return date.value;

  switch (date.type) {
    case "simple":
      return `[[date:${date.value}]]`;
    case "time":
      return `[[date:${date.value}]]`;
    case "week":
      return `[[date:${date.value}]]`;
    case "duration":
      return `[[date:${date.value}]]`;
    default:
      return date.value;
  }
}

/**
 * Convert dates in text to Tana date format
 *
 * Modified to preserve purely numeric values that aren't dates
 * and to properly handle ID fields that might contain numbers
 */
function convertDates(text: string): string {
  // Check if this is likely to be a numeric ID and not a date
  if (
    text.toLowerCase().includes("id") &&
    text.match(/\d{4,}/) &&
    !text.match(/\d{4}-\d{2}-\d{2}/)
  ) {
    return text;
  }

  // First protect URLs and existing references
  const protectedItems: string[] = [];
  text = text.replace(
    /(?:\[\[.*?\]\]|https?:\/\/[^\s)]+|\[[^\]]+\]\([^)]+\))/g,
    (match) => {
      protectedItems.push(match);
      return `__PROTECTED_${protectedItems.length - 1}__`;
    },
  );

  // Process dates
  text = text.replace(
    /(?:\[\[date:)?(?:\[\[.*?\]\]|\d{4}(?:-\d{2}(?:-\d{2})?)?(?:\s+\d{2}:\d{2})?(?:\/(?:\[\[.*?\]\]|\d{4}(?:-\d{2}(?:-\d{2})?)?(?:\s+\d{2}:\d{2})?))?)(?:\]\])?|(?:Week \d{1,2},\s*\d{4})|(?:Weeks \d{1,2}-\d{1,2},\s*\d{4})|(?:[A-Z][a-z]+\s+(?:⌘\s+)?\d{4})|(?:[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?,\s*\d{4}(?:,\s*\d{1,2}:\d{2}\s*(?:AM|PM))?)|(?:[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?\s*-\s*[A-Z][a-z]+ \d{1,2}(?:st|nd|rd|th)?,\s*\d{4})/g,
    (match) => {
      // Skip pure numeric IDs
      if (match.match(/^\d+$/) && match.length < 5) {
        return match;
      }
      const parsed = parseDate(match);
      return parsed ? formatTanaDate(parsed) : match;
    },
  );

  // Restore protected content
  text = text.replace(
    /__PROTECTED_(\d+)__/g,
    (_, index) => protectedItems[parseInt(index)],
  );

  return text;
}

/**
 * Convert month abbreviation to number (01-12)
 */
function getMonthNumber(month: string): string {
  const months: { [key: string]: string } = {
    January: "01",
    Jan: "01",
    February: "02",
    Feb: "02",
    March: "03",
    Mar: "03",
    April: "04",
    Apr: "04",
    May: "05",
    June: "06",
    Jun: "06",
    July: "07",
    Jul: "07",
    August: "08",
    Aug: "08",
    September: "09",
    Sep: "09",
    October: "10",
    Oct: "10",
    November: "11",
    Nov: "11",
    December: "12",
    Dec: "12",
  };
  return months[month] || "01";
}

/**
 * Convert markdown fields to Tana fields
 *
 * Fix for issue #2: "Regular text with colons incorrectly converted to fields"
 * This function is now smarter about when to convert text with colons to fields.
 * It uses heuristics to distinguish between descriptive text with colons and actual fields.
 */
function convertFields(text: string): string {
  // Skip if already contains a field marker
  if (text.includes("::")) return text;

  // Skip if it's a table row
  if (text.includes("|")) return text;

  // Check for patterns that indicate colons in regular text rather than fields
  const isLikelyRegularText = (
    key: string,
    value: string,
    prefix: string | undefined,
    fullLine: string,
  ): boolean => {
    // If this isn't a list item and doesn't look like a metadata block, it's likely regular text
    const isStandaloneText = !prefix && !fullLine.trim().startsWith("-");
    if (isStandaloneText) {
      return true;
    }

    // Check for numbered list items (1., 2., etc.) - usually not fields
    if (fullLine.match(/^\s*\d+\.\s+/)) {
      return true;
    }

    // Common words/phrases that indicate instructional content, not fields
    const instructionalPhrases = [
      "step",
      "how to",
      "note",
      "example",
      "tip",
      "warning",
      "caution",
      "important",
      "remember",
      "click",
      "select",
      "choose",
      "press",
      "type",
      "enter",
      "copy",
      "paste",
      "invoke",
      "generate",
      "hook",
      "connect",
      "create",
      "toggle",
      "shortcut",
      "using",
      "next",
      "first",
      "second",
      "third",
      "fourth",
      "fifth",
      "last",
      "final",
    ];

    // If the key contains instructional phrases, it's likely not a field
    if (
      instructionalPhrases.some((phrase) => key.toLowerCase().includes(phrase))
    ) {
      return true;
    }

    // UI elements often followed by instructions, not field values
    const uiElements = [
      "window",
      "dialog",
      "menu",
      "button",
      "link",
      "option",
      "panel",
      "screen",
      "tab",
      "toolbar",
      "sidebar",
      "modal",
      "keyboard",
      "mouse",
    ];

    // If the key contains UI elements, it's likely instructions
    if (uiElements.some((element) => key.toLowerCase().includes(element))) {
      return true;
    }

    // If the value contains instructional language, it's likely not a field
    if (value.match(/press|click|select|use|open|go to|install|save|using/i)) {
      return true;
    }

    // If the value starts with an article or preposition, it's likely a sentence
    if (
      value.match(
        /^(The|A|An|This|That|These|Those|To|In|On|At|By|With|From|For|About)\s/i,
      )
    ) {
      return true;
    }

    // If the value contains parentheses indicating field status
    if (value.includes("(field)") || value.includes("(not a field)")) {
      return value.includes("(not a field)");
    }

    // If the value contains punctuation common in natural language
    const hasPunctuation = value.match(/[;,()]/) || value.includes(" - ");
    const isFieldTest = value.match(/\([^)]*field[^)]*\)/i);
    if (hasPunctuation && !isFieldTest) {
      return true;
    }

    // Likely patterns for real fields - used to identify actual fields
    const likelyFieldPatterns = [
      // Project metadata
      "name",
      "title",
      "status",
      "priority",
      "assignee",
      "tag",
      "category",
      "owner",
      "due date",
      "start date",
      "created",
      "updated",
      "version",
      "id",
      "type",
      "format",

      // Content metadata
      "author",
      "publisher",
      "published",
      "isbn",
      "url",
      "link",

      // Common fields
      "email",
      "phone",
      "address",
      "location",
      "property",
      "completion",
    ];

    // If key matches common field patterns, it's likely a real field
    if (
      likelyFieldPatterns.some(
        (pattern) =>
          key.toLowerCase() === pattern ||
          key.toLowerCase().startsWith(pattern + " ") ||
          key.toLowerCase().endsWith(" " + pattern),
      )
    ) {
      return false; // Not regular text, it's a field
    }

    // In the context of a markdown list with a dash (-)
    // If we have a simple "Key: Value" format with a short value, it's more likely to be a field
    if (prefix && key.split(" ").length <= 3) {
      // Simple values are likely fields
      if (value.split(" ").length <= 3 && !value.match(/[;,():"']/)) {
        return false; // Not regular text, it's a field
      }

      // Check for uppercase first letter in key - often indicates a field
      if (key[0] === key[0].toUpperCase() && value.split(" ").length <= 5) {
        return false; // Not regular text, it's a field
      }
    }

    // When in doubt with longer content, assume it's regular text
    return true;
  };

  return text.replace(
    /^(\s*[-*+]\s+)?([^:\n]+):\s+([^\n]+)$/gm,
    (match, prefix, key, value) => {
      // Skip if value is already a reference
      if (value.match(/^\[\[/)) return match;

      // Skip if this looks like regular text rather than a field
      if (isLikelyRegularText(key, value, prefix, match)) {
        return match;
      }

      // Likely to be an actual field - proceed with conversion
      return `${prefix || ""}${key}::${value}`;
    },
  );
}

/**
 * Process inline formatting
 */
function processInlineFormatting(text: string): string {
  // First protect URLs and existing references
  const protectedItems: string[] = [];
  text = text.replace(/(\[\[.*?\]\]|https?:\/\/[^\s)]+)/g, (match) => {
    protectedItems.push(match);
    return `__PROTECTED_${protectedItems.length - 1}__`;
  });

  // Process formatting first
  text = text
    // Bold/italic
    .replace(/\*\*([^*]+)\*\*/g, "**$1**")
    .replace(/\*([^*]+)\*/g, "__$1__")
    // Highlight
    .replace(/==([^=]+)==/g, "^^$1^^");

  // Handle image syntax first
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, title, url) =>
    title ? `${title}::!${title} ${url}` : `!Image ${url}`,
  );

  // Handle link syntax next (but preserve the bracketed text for now)
  const linkItems: { [key: string]: string } = {};
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    const key = `__LINK_${Object.keys(linkItems).length}__`;
    linkItems[key] = `${linkText} ${url}`;
    return key;
  });

  // Preserve bracketed elements that are not links
  // Fix for issue #1: "bracketed elements in text become supertags when they shouldn't"
  // We need to preserve regular bracketed text [like this] so it doesn't get converted
  text = text.replace(/\[([^\]]+)\]/g, (match) => {
    protectedItems.push(match);
    return `__PROTECTED_${protectedItems.length - 1}__`;
  });

  // Note: We are deliberately NOT converting parentheses to tags anymore.
  // Previous behavior:
  // text = text.replace(/\(([^)]+)\)/g, (_, tag) => {
  //   if (tag.match(/^\[\[.*\]\]$/)) return `(${tag})`;
  //   return tag.includes(' ') ? `#[[${tag}]]` : `#${tag}`;
  // });
  // This was causing regular text in parentheses to be incorrectly converted to tags.
  // Tags in Markdown should already use the # symbol, which will be preserved.

  // Restore links
  text = text.replace(
    /__LINK_(\d+)__/g,
    (_, index) => linkItems[`__LINK_${index}__`],
  );

  // Restore protected content
  text = text.replace(
    /__PROTECTED_(\d+)__/g,
    (_, index) => protectedItems[parseInt(index)],
  );

  return text;
}

/**
 * Process code blocks - just extract the content as plain text
 */
function processCodeBlock(lines: string[]): string {
  // Skip the first and last lines (the ```)
  return lines
    .slice(1, -1)
    .map((line) => line.trim())
    .join("\n");
}

/**
 * Process table row
 * @param row - Table row text
 * @returns Processed row text
 */
export function processTableRow(text: string): string {
  return text
    .split("|")
    .map((cell) => cell.trim())
    .filter(Boolean)
    .join(" | ");
}

/**
 * Convert markdown to Tana format
 *
 * Enhanced to properly indent content under headings without using Tana's heading format
 */
export function convertToTana(inputText: string | undefined | null): string {
  if (!inputText) return "No text selected.";

  // Split into lines and parse
  const lines = inputText.split("\n").map((line) => parseLine(line));

  // Build hierarchy
  const hierarchicalLines = buildHierarchy(lines);

  // Generate output
  let output = "%%tana%%\n";
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  // Map to store each line's indentation level in the output
  const indentationLevels: Map<number, number> = new Map();

  // Start with root level at 0
  indentationLevels.set(-1, 0);

  // First pass to determine indentation levels
  for (let i = 0; i < hierarchicalLines.length; i++) {
    const line = hierarchicalLines[i];

    if (!line.content.trim()) continue;

    const parentIndex = line.parent !== undefined ? line.parent : -1;
    const parentLevel = indentationLevels.get(parentIndex) ?? 0;

    // Determine indentation level
    if (line.isHeader) {
      const level = line.content.match(/^#+/)?.[0].length ?? 1;

      // The indentation for a header is based on its header level
      // H1 = level 0, H2 = level 1, etc.
      indentationLevels.set(i, level - 1);
    } else {
      // Content indentation is one more than its parent
      indentationLevels.set(i, parentLevel + 1);
    }
  }

  // Second pass to generate the output
  for (let i = 0; i < hierarchicalLines.length; i++) {
    const line = hierarchicalLines[i];
    const content = line.content.trim();

    if (!content) continue;

    // Use the indentation level we determined in the first pass
    const level = indentationLevels.get(i) ?? 0;
    const indent = "  ".repeat(level);

    // Handle code blocks
    if (line.isCodeBlock || inCodeBlock) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockLines = [line.raw];
      } else if (line.isCodeBlock) {
        inCodeBlock = false;
        codeBlockLines.push(line.raw);
        output += `${indent}- ${processCodeBlock(codeBlockLines)}\n`;
        codeBlockLines = [];
      } else {
        codeBlockLines.push(line.raw);
      }
      continue;
    }

    // Process line content
    let processedContent = content;

    // Handle headers - convert to regular text without using Tana's heading format
    if (line.isHeader) {
      const match = content.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        // Just use the header text without the !! prefix
        processedContent = match[2];
      }
    } else {
      // Remove list markers but preserve checkboxes
      processedContent = processedContent.replace(/^[-*+]\s+(?!\[[ x]\])/, "");

      // Convert fields first
      processedContent = convertFields(processedContent);

      // Then convert dates
      processedContent = convertDates(processedContent);

      // Finally process inline formatting
      processedContent = processInlineFormatting(processedContent);
    }

    output += `${indent}- ${processedContent}\n`;
  }

  return output;
}
