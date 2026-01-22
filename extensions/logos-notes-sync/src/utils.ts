import { LogosNote, ProcessedNote } from "./types";
import * as fs from "fs";
import * as path from "path";
import { homedir } from "os";

/**
 * Extract plain text from Logos rich text XML format
 */
export function extractTextFromRichText(richText: unknown): string {
  if (!richText) return "";

  // Ensure we have a string
  if (typeof richText !== "string") {
    return "";
  }

  // Extract text from Run elements
  const textMatches = richText.match(/Text="([^"]*)"/g) || [];
  const texts = textMatches.map((match) => {
    const text = match.replace(/Text="([^"]*)"/, "$1");
    return text;
  });

  return texts.join("").trim();
}

/**
 * Process raw Logos notes into a cleaner format
 */
export function processNotes(notes: LogosNote[]): ProcessedNote[] {
  // Deduplicate notes by ID (in case of duplicate fetches)
  const uniqueNotes = Array.from(new Map(notes.map((n) => [n.id, n])).values());

  return uniqueNotes.map((note) => {
    const anchor = note.anchors?.[0];
    const textRange = anchor?.textRange;

    let text = "";
    if (anchor?.previewRichText) {
      text = extractTextFromRichText(anchor.previewRichText);
    }
    if (note.content) {
      const contentText = extractTextFromRichText(note.content);
      if (contentText) text = contentText;
    }

    return {
      id: note.id,
      kind: note.noteKind,
      created: note.created,
      modified: note.modified,
      text,
      reference: textRange?.reference?.display || null,
      referenceRaw: textRange?.reference?.raw || null,
      resourceId: textRange?.resourceId || "Unknown",
      resourceTitle: textRange?.resourceFullTitle || textRange?.resourceTitle || "Unknown",
      color: note.style?.color || null,
      offset: textRange?.offset ?? null,
    };
  });
}

/**
 * Group notes by resource
 */
export function groupNotesByResource(notes: ProcessedNote[]): Map<string, ProcessedNote[]> {
  const grouped = new Map<string, ProcessedNote[]>();

  for (const note of notes) {
    const key = note.resourceId;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(note);
  }

  return grouped;
}

/**
 * Sanitize a string for use as a filename
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .trim()
    .slice(0, 200);
}

/**
 * Create a Logos deep link that searches for text within a resource
 */
export function createLogosLink(resourceId: string, searchText?: string | null): string {
  if (!resourceId || resourceId === "Unknown") return "";

  // If we have search text, create a search link within the resource
  if (searchText) {
    // Take first ~50 chars but ensure we end on a complete word
    let query = searchText.slice(0, 50).trim();

    // If we cut in the middle of a word, find the last space and truncate there
    if (searchText.length > 50 && !/\s/.test(searchText[50])) {
      const lastSpace = query.lastIndexOf(" ");
      if (lastSpace > 10) {
        query = query.slice(0, lastSpace);
      }
    }

    // Wrap in quotes for exact phrase search
    const quotedQuery = `"${query}"`;
    // URL encode the query
    const encodedQuery = encodeURIComponent(quotedQuery);
    // Format: logos4:Search;kind=BasicSearch;q=QUERY;in=raw:Single|ResourceId=RESOURCE_ID
    // The | is encoded as $7C and = as $3D
    return `logos4:Search;kind=BasicSearch;q=${encodedQuery};syntax=v2;in=raw:Single$7CResourceId$3D${resourceId}`;
  }

  // Fallback to just opening the resource
  const cleanId = resourceId.replace(/^LLS:/, "");
  return `logosres:${cleanId}`;
}

/**
 * Generate YAML frontmatter for Obsidian
 */
export function generateFrontmatter(resourceTitle: string, resourceId: string, noteCount: number): string {
  const lines = ["---"];
  lines.push(`title: ${resourceTitle}`);

  if (resourceId && resourceId !== "Unknown") {
    lines.push(`logos_resource_id: ${resourceId}`);
    lines.push(`logos_link: ${createLogosLink(resourceId)}`);
  }

  const today = new Date().toISOString().split("T")[0];
  lines.push(`synced: ${today}`);
  lines.push(`note_count: ${noteCount}`);
  lines.push("tags:");
  lines.push("  - Logos");
  lines.push("---");

  return lines.join("\n");
}

/**
 * Expand ~ in paths
 */
export function expandPath(inputPath: string): string {
  if (inputPath.startsWith("~")) {
    return path.join(homedir(), inputPath.slice(1));
  }
  return inputPath;
}

/**
 * Write notes to Obsidian markdown files
 */
export function writeNotesToObsidian(
  notesByResource: Map<string, ProcessedNote[]>,
  outputDir: string,
  includeColor: boolean,
  excludedResourceIds: string[],
): { filesWritten: number; notesWritten: number } {
  const expandedDir = expandPath(outputDir);

  // Ensure directory exists
  if (!fs.existsSync(expandedDir)) {
    fs.mkdirSync(expandedDir, { recursive: true });
  }

  let filesWritten = 0;
  let notesWritten = 0;

  for (const [resourceId, notes] of notesByResource) {
    // Skip excluded resources
    if (excludedResourceIds.includes(resourceId)) {
      continue;
    }

    // Filter to notes with actual text
    const notesWithText = notes.filter((n) => n.text.trim());
    if (notesWithText.length === 0) continue;

    const resourceTitle = notesWithText[0].resourceTitle;
    const filename = `${sanitizeFilename(resourceTitle)}.md`;
    const filepath = path.join(expandedDir, filename);

    // Build content
    const contentParts: string[] = [];

    // Frontmatter
    contentParts.push(generateFrontmatter(resourceTitle, resourceId, notesWithText.length));
    contentParts.push("");

    // Title
    contentParts.push(`# ${resourceTitle}`);
    contentParts.push("");

    // Sort by creation date
    notesWithText.sort((a, b) => a.created.localeCompare(b.created));

    // Notes as bullet points
    for (const note of notesWithText) {
      // Handle multi-line content
      const lines = note.text.split("\n");
      const formattedLines = lines.map((line, i) => {
        if (i === 0) return `- ${line}`;
        return line.trim() ? `  ${line}` : "";
      });

      contentParts.push(formattedLines.filter(Boolean).join("\n"));

      // Add reference and link
      const linkParts: string[] = [];
      if (note.reference) linkParts.push(note.reference);
      if (resourceId && resourceId !== "Unknown") {
        // Create search link to find this text within the resource
        const link = createLogosLink(resourceId, note.text);
        linkParts.push(`[Open in Logos](${link})`);
      }

      if (linkParts.length > 0) {
        contentParts.push(`  *${linkParts.join(" | ")}*`);
      }

      contentParts.push("");
    }

    // Write file
    fs.writeFileSync(filepath, contentParts.join("\n"), "utf-8");
    filesWritten++;
    notesWritten += notesWithText.length;
  }

  return { filesWritten, notesWritten };
}
