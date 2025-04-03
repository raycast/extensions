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
  isListItem?: boolean;
  parent?: number;
}

/**
 * Parse a line to determine its structure
 */
function parseLine(line: string): Line {
  const raw = line;

  // Calculate indent level based on spaces and tabs
  const match = line.match(/^(\s*)/);
  const spaces = match ? match[1].length : 0;
  // Consider tabs as 2 spaces for indentation purposes
  const tabAdjustedSpaces = line.slice(0, spaces).replace(/\t/g, "  ").length;
  const indent = Math.floor(tabAdjustedSpaces / 2);

  // Get content without indentation
  const content = line.slice(spaces).trimEnd();

  // Detect if it's a header
  const isHeader = content.startsWith("#");

  // Detect if it's a code block
  const isCodeBlock = content.startsWith("```");

  // Detect if it's a list item (bullet point or numbered/lettered)
  const isListItem =
    /^[-*+•]\s+/.test(content) ||
    /^[a-z]\.\s+/i.test(content) ||
    /^\d+\.\s+/.test(content);

  return {
    content,
    indent,
    raw,
    isHeader,
    isCodeBlock,
    isListItem,
    parent: undefined,
  };
}

/**
 * Build the hierarchy by linking lines to their parents
 *
 * Enhanced to properly nest headings based on their level (H1, H2, etc.)
 * and to handle numbered headers like '### 1. Context Awareness:' correctly
 */
function buildHierarchy(lines: Line[]): Line[] {
  if (lines.length === 0) return lines;

  const result = [...lines];

  // Track the most recent header at each level
  // headersAtLevel[0] = H1, headersAtLevel[1] = H2, etc.
  const headersAtLevel: number[] = [];

  // Track section headers (headings with numbers like "1. Title")
  const sectionHeaders: Set<number> = new Set();

  let lastParentAtLevel: number[] = [-1];
  let inCodeBlock = false;
  let codeBlockParent: number | undefined = undefined;
  let currentSection = -1;

  // First pass - identify numbered section headers
  for (let i = 0; i < result.length; i++) {
    const line = result[i];
    const content = line.content.trim();
    if (line.isHeader && /^#+\s+\d+\./.test(content)) {
      const level = content.match(/^#+/)?.[0].length ?? 1;
      sectionHeaders.add(i);
    }
  }

  // Second pass - build hierarchy with special handling for sections
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

      // Check if this is a numbered header (e.g., "### 1. Context Awareness")
      const isNumberedHeader = /^#+\s+\d+\./.test(content);

      // Find the parent for this header based on heading levels
      if (level === 1) {
        // Top-level (H1) headings are at the root
        line.parent = -1;
        currentSection = -1;
      } else {
        // Subheadings (H2+) are children of the most recent header one level up
        // For example, H2s are children of the most recent H1
        let parentIdx = -1;
        if (level > 1 && level - 2 < headersAtLevel.length) {
          parentIdx = headersAtLevel[level - 2] ?? -1;
        }
        line.parent = parentIdx;

        // If this is a numbered header, set it as the current section
        if (isNumberedHeader) {
          currentSection = i;
        }
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

    // Special case for lines that look like section content
    // These are lines like "**Definition:**" which should be children of the section
    if (currentSection >= 0 && /^\*\*[^*:]+:\*\*/.test(content)) {
      line.parent = currentSection;
      lastParentAtLevel = [currentSection];
      continue;
    }

    // Handle list items and content
    const effectiveIndent = line.indent;

    // Check if previous line ends with a colon - this often indicates a sublist follows
    const prevLineEndsWithColon =
      i > 0 && result[i - 1]?.content.trim().endsWith(":");

    // Check for lettered list items (a., b., etc.)
    const isLetteredListItem = /^[a-z]\.\s+/i.test(line.content.trim());

    // Find the previous lettered list item to maintain consistent indentation
    let prevLetteredItemIndex = -1;
    if (isLetteredListItem) {
      for (let j = i - 1; j >= 0; j--) {
        if (/^[a-z]\.\s+/i.test(result[j].content.trim())) {
          prevLetteredItemIndex = j;
          break;
        }
      }
    }

    // Adjust indentation based on context
    let adjustedIndent = effectiveIndent;

    // If this is the first lettered item after a colon, increase indentation
    if (
      isLetteredListItem &&
      prevLetteredItemIndex === -1 &&
      prevLineEndsWithColon
    ) {
      adjustedIndent = effectiveIndent + 1;
    }
    // If this is a subsequent lettered item, use the same indentation as the first one
    else if (isLetteredListItem && prevLetteredItemIndex !== -1) {
      adjustedIndent = result[prevLetteredItemIndex].indent;
      // If parent was adjusted, use that adjustment
      if (result[prevLetteredItemIndex].parent !== undefined) {
        line.parent = result[prevLetteredItemIndex].parent;
      }
    }
    // For regular list items after a colon
    else if (line.isListItem && prevLineEndsWithColon) {
      adjustedIndent = effectiveIndent + 1;
    }

    // Skip parent assignment if we've explicitly set it for lettered items
    if (
      !(
        isLetteredListItem &&
        prevLetteredItemIndex !== -1 &&
        line.parent !== undefined
      )
    ) {
      // Find the appropriate parent
      while (lastParentAtLevel.length > adjustedIndent + 1) {
        lastParentAtLevel.pop();
      }

      // Content is parented to the most recent element at the previous indentation level
      if (effectiveIndent < lastParentAtLevel.length) {
        line.parent = lastParentAtLevel[effectiveIndent];
      } else {
        // If we're in a section and this is a direct child, parent to the section
        if (currentSection >= 0 && effectiveIndent <= 1) {
          line.parent = currentSection;
        } else {
          line.parent = -1;
        }
      }
    }

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
 * Process inline formatting with special handling for bold text
 */
function processInlineFormatting(text: string): string {
  // First protect URLs and existing references
  const protectedItems: string[] = [];

  const protectItem = (match: string) => {
    protectedItems.push(match);
    return `__PROTECTED_${protectedItems.length - 1}__`;
  };

  // Protect URLs and existing references
  text = text.replace(/(\[\[.*?\]\]|https?:\/\/[^\s)]+)/g, protectItem);

  // Handle bold text formatting first - key to fix Claude's markdown
  const boldElements: string[] = [];

  const saveBold = (match: string, content: string) => {
    const key = `__BOLD_${boldElements.length}__`;
    boldElements.push(`**${content}**`);
    return key;
  };

  // Extract and protect bold text
  text = text.replace(/\*\*([^*]+)\*\*/g, saveBold);

  // Process other formatting
  text = text.replace(/\*([^*]+)\*/g, "__$1__"); // Italic
  text = text.replace(/==([^=]+)==/g, "^^$1^^"); // Highlight

  // Handle image syntax
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, title, url) =>
    title ? `${title}::!${title} ${url}` : `!Image ${url}`,
  );

  // Handle link syntax
  const linkItems: { [key: string]: string } = {};
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
    const key = `__LINK_${Object.keys(linkItems).length}__`;
    linkItems[key] = `${linkText} ${url}`;
    return key;
  });

  // Preserve bracketed elements that are not links
  text = text.replace(/\[([^\]]+)\]/g, protectItem);

  // Restore links
  for (const [key, value] of Object.entries(linkItems)) {
    text = text.replace(key, value);
  }

  // Restore bold elements
  for (let i = 0; i < boldElements.length; i++) {
    text = text.replace(`__BOLD_${i}__`, boldElements[i]);
  }

  // Restore protected content
  for (let i = 0; i < protectedItems.length; i++) {
    text = text.replace(`__PROTECTED_${i}__`, protectedItems[i]);
  }

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
 * Detects if a line contains a YouTube transcript in the format (MM:SS)
 * @param text The text to check for timestamps
 * @returns Array of segments split by timestamps, with each timestamp as its own segment
 */
function processYouTubeTranscriptTimestamps(text: string): string[] {
  // Check if this is a transcript line
  if (!text.includes("Transcript:")) {
    return [text];
  }

  // This regex matches YouTube timestamps in format (MM:SS) or (HH:MM:SS)
  const timestampRegex = /\((\d{1,2}:\d{2}(?::\d{2})?)\)/g;

  // If no timestamps found, return the original text
  if (!text.match(timestampRegex)) {
    return [text];
  }

  // Clean the text by removing unnecessary quotes
  const cleanedText = text
    .replace(/Transcript:\s*"/, "Transcript: ")
    .replace(/"$/, "");

  // Initialize the segments array
  const segments: string[] = [];

  // Find all timestamp matches
  const matches: RegExpExecArray[] = [];
  let match;
  while ((match = timestampRegex.exec(cleanedText)) !== null) {
    matches.push({ ...match });
  }

  // If no matches, return the original text
  if (matches.length === 0) {
    return [text];
  }

  // Process each timestamp and the text that follows it
  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const nextMatch = i < matches.length - 1 ? matches[i + 1] : null;

    // For the first timestamp, include the "Transcript:" label
    if (i === 0) {
      const startIndex = cleanedText.indexOf("Transcript:");
      const beforeTimestamp = cleanedText
        .substring(startIndex, currentMatch.index)
        .trim();
      const endIndex = nextMatch ? nextMatch.index : cleanedText.length;
      const segment =
        beforeTimestamp +
        " " +
        cleanedText.substring(currentMatch.index, endIndex).trim();
      segments.push(segment);
    } else {
      // For subsequent timestamps
      const endIndex = nextMatch ? nextMatch.index : cleanedText.length;
      const segment = cleanedText
        .substring(currentMatch.index, endIndex)
        .trim();
      segments.push(segment);
    }
  }

  return segments;
}

/**
 * Process a Limitless Pendant transcription section
 * Format: > [Speaker](#startMs=timestamp&endMs=timestamp): Text
 */
function processLimitlessPendantTranscription(text: string): string {
  // Check if it matches the Limitless Pendant format
  const match = text.match(
    /^>\s*\[(.*?)\]\(#startMs=\d+&endMs=\d+\):\s*(.*?)$/,
  );
  if (!match) return text;

  const speaker = match[1];
  const content = match[2];

  // Format as simple "{Speaker}: {Content}" (no fields)
  return `${speaker}: ${content}`;
}

/**
 * Detect if text is a Limitless Pendant transcription
 */
function isLimitlessPendantTranscription(text: string): boolean {
  // Check for multiple lines in the Limitless Pendant format
  const lines = text.split("\n");
  let pendantFormatCount = 0;

  for (const line of lines) {
    if (line.match(/^>\s*\[(.*?)\]\(#startMs=\d+&endMs=\d+\):/)) {
      pendantFormatCount++;
    }

    // If we found multiple matching lines, it's likely a Limitless Pendant transcription
    if (pendantFormatCount >= 3) {
      return true;
    }
  }

  return false;
}

/**
 * Convert markdown to Tana format
 *
 * Enhanced to properly indent content under headings without using Tana's heading format
 * and to correctly handle formatting from Claude's AI outputs
 */
export function convertToTana(inputText: string | undefined | null): string {
  if (!inputText) return "No text selected.";

  // Check if this is a Limitless Pendant transcription
  const isPendantTranscription = isLimitlessPendantTranscription(inputText);

  // Process the input for YouTube transcript timestamps
  const processedLines: string[] = [];
  inputText.split("\n").forEach((line) => {
    // Check if this line contains YouTube timestamps and split it if needed
    const segments = processYouTubeTranscriptTimestamps(line);
    processedLines.push(...segments);
  });

  // Join the processed lines back together
  const processedInputText = processedLines.join("\n");

  // Split into lines and parse
  const lines = processedInputText.split("\n").map((line) => parseLine(line));

  // Build hierarchy
  const hierarchicalLines = buildHierarchy(lines);

  // Generate output
  let output = "%%tana%%\n";
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];

  // Map to store each line's indentation level in the output
  const indentationLevels: Map<number, number> = new Map();

  // Identify section headers (numbered headings)
  const sectionHeaders: Set<number> = new Set();
  const sectionContent: Map<number, number[]> = new Map();

  for (let i = 0; i < hierarchicalLines.length; i++) {
    const line = hierarchicalLines[i];
    const content = line.content.trim();
    if (!content) continue;

    if (line.isHeader && /^#+\s+\d+\./.test(content)) {
      sectionHeaders.add(i);
      sectionContent.set(i, []);
    }
  }

  // Start with root level at 0
  indentationLevels.set(-1, 0);

  // First pass to determine indentation levels
  for (let i = 0; i < hierarchicalLines.length; i++) {
    const line = hierarchicalLines[i];
    const content = line.content.trim();
    if (!content) continue;

    const parentIdx = line.parent !== undefined ? line.parent : -1;

    // Add to section content if parented to a section header
    if (sectionHeaders.has(parentIdx)) {
      const currentContent = sectionContent.get(parentIdx) || [];
      currentContent.push(i);
      sectionContent.set(parentIdx, currentContent);
    }

    const parentLevel = indentationLevels.get(parentIdx) ?? 0;

    // Determine indentation level
    if (line.isHeader) {
      const headerMatch = content.match(/^(#+)/);
      const level = headerMatch ? headerMatch[0].length : 1;

      // The indentation for a header is based on its header level
      // H1 = level 0, H2 = level 1, etc.
      indentationLevels.set(i, level - 1);
    } else {
      // Special case for content directly under a section header
      if (sectionHeaders.has(parentIdx)) {
        // Content under a section header should be indented one level deeper
        indentationLevels.set(i, (indentationLevels.get(parentIdx) ?? 0) + 1);
      } else {
        // Special case for Limitless Pendant transcription lines - indent them deeper
        if (isPendantTranscription && content.startsWith(">")) {
          // Find the current section this line belongs to
          let currentSectionIdx = parentIdx;
          while (
            currentSectionIdx >= 0 &&
            !hierarchicalLines[currentSectionIdx]?.isHeader
          ) {
            currentSectionIdx =
              hierarchicalLines[currentSectionIdx]?.parent ?? -1;
          }

          if (currentSectionIdx >= 0) {
            // Get the header level
            const headerContent =
              hierarchicalLines[currentSectionIdx].content.trim();
            const headerMatch = headerContent.match(/^(#+)/);
            const headerLevel = headerMatch ? headerMatch[0].length : 1;

            // Indent as if it's one level deeper than the section header
            indentationLevels.set(i, headerLevel);
          } else {
            // Default to parent level + 2 if we can't find a header
            indentationLevels.set(i, parentLevel + 2);
          }
        } else {
          // Normal content indentation is one more than its parent
          indentationLevels.set(i, parentLevel + 1);
        }
      }
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
      // Check if this is a Limitless Pendant transcription line
      if (isPendantTranscription && processedContent.startsWith(">")) {
        processedContent =
          processLimitlessPendantTranscription(processedContent);
      } else {
        // Remove list markers of all types but preserve checkboxes
        // This handles standard markdown list markers (-, *, +) as well as bullet points (•) and lettered/numbered lists (a., b., 1., etc.)
        processedContent = processedContent.replace(
          /^[-*+•]\s+(?!\[[ x]\])/,
          "",
        );
        processedContent = processedContent.replace(/^[a-z]\.\s+/i, "");
        processedContent = processedContent.replace(/^\d+\.\s+/, "");
      }

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
