import { FMItem, Link } from "./types";

// Generates a simple hash for unique item IDs, incorporating the URL to prevent collisions
function generateId(
  title: string,
  category: string,
  section: string,
  url: string,
): string {
  const str = `${category}-${section}-${title}-${url}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Find split position for description delimiter that is outside markdown links
function findDescriptionSplit(line: string): number {
  let bracketDepth = 0;
  let parenDepth = 0;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === "[") bracketDepth++;
    else if (char === "]") bracketDepth--;
    else if (char === "(") parenDepth++;
    else if (char === ")") parenDepth--;
    else if (bracketDepth === 0 && parenDepth === 0) {
      // Check for common separators
      if (line.slice(i, i + 3) === " - ") return i;
      if (line.slice(i, i + 3) === " – ") return i; // en dash
      if (line.slice(i, i + 3) === " — ") return i; // em dash
    }
  }
  return -1;
}

export function parseMarkdownFile(content: string, category: string): FMItem[] {
  const items: FMItem[] = [];
  const lines = content.split(/\r?\n/);
  let position = 0;

  let currentSubcategory = "";
  let currentSection = "";

  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  for (let line of lines) {
    line = line.trim();

    // 1. Parse headers to keep track of structure
    if (line.startsWith("# ")) {
      currentSubcategory = line.replace("#", "").replace(/[►▷]/g, "").trim();
      currentSection = ""; // Reset section when subcategory changes
      continue;
    }
    if (line.startsWith("## ")) {
      currentSection = line.replace("##", "").replace(/[►▷]/g, "").trim();
      continue;
    }

    // 2. Ignore non-list lines
    if (!line.startsWith("* ") && !line.startsWith("- ")) {
      continue;
    }

    // 3. Skip notes and warnings
    const lowerLine = line.toLowerCase();
    if (
      lowerLine.startsWith("* **note**") ||
      lowerLine.startsWith("* **warning**") ||
      lowerLine.startsWith("* **important**") ||
      lowerLine.startsWith("- **note**") ||
      lowerLine.startsWith("- **warning**") ||
      lowerLine.startsWith("- **important**")
    ) {
      continue;
    }

    // 4. Detect starred items
    const starred = line.includes("⭐") || line.includes("🌟");

    // 5. Split line into links part and description part
    const splitIndex = findDescriptionSplit(line);
    const linksPart = splitIndex !== -1 ? line.slice(0, splitIndex) : line;
    const descPart = splitIndex !== -1 ? line.slice(splitIndex + 3) : "";

    // 6. Extract links from linksPart
    const mainLinks: { text: string; url: string }[] = [];
    let match;
    linkRegex.lastIndex = 0;
    while ((match = linkRegex.exec(linksPart)) !== null) {
      mainLinks.push({ text: match[1].trim(), url: match[2].trim() });
    }

    if (mainLinks.length === 0) {
      continue; // No links found in this entry, skip it
    }

    // First link is the primary item link
    const primaryLink = mainLinks[0];
    const title = primaryLink.text;
    const url = primaryLink.url;

    // Subsequent links in the links part are mirrors or alternatives
    const mirrors: string[] = [];
    const alternatives: Link[] = [];

    for (let i = 1; i < mainLinks.length; i++) {
      const link = mainLinks[i];
      // If it is just a number (mirror), like [2], [3], etc.
      if (/^\d+$/.test(link.text)) {
        mirrors.push(link.url);
      } else {
        alternatives.push({ name: link.text, url: link.url });
      }
    }

    // 7. Parse official links from description part
    const officialLinks: Link[] = [];
    linkRegex.lastIndex = 0;
    while ((match = linkRegex.exec(descPart)) !== null) {
      const name = match[1].trim();
      const linkUrl = match[2].trim();
      officialLinks.push({ name, url: linkUrl });
    }

    // 8. Clean up description part
    // Strip markdown links and double asterisks
    let description = descPart
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "") // remove markdown links
      .replace(/\*\*/g, "") // remove bold markers
      .replace(/Or /gi, "") // remove loose "Or" words
      .trim();

    // Clean up trailing slashes, commas, pipes
    description = description.replace(/^[\s,/|–—-]+|[\s,/|–—-]+$/g, "").trim();

    const id = generateId(
      title,
      category,
      currentSection || currentSubcategory,
      url,
    );

    items.push({
      id,
      title,
      url,
      description,
      category,
      subcategory: currentSubcategory,
      section: currentSection,
      mirrors,
      alternatives,
      officialLinks,
      starred,
      position: ++position,
    });
  }

  return items;
}
