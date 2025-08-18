import { ObsidianNote, NoteWithUrl } from "../types";

/**
 * Service for parsing markdown frontmatter and extracting URLs
 */
export class FrontmatterParser {
  constructor(private urlProperties: string[] = ["url", "link", "website"]) {}

  /**
   * Parses a markdown file and extracts frontmatter
   */
  async parseFile(_filePath: string): Promise<Record<string, unknown>> {
    // Implementation will be added in the next phase
    return {};
  }

  /**
   * Extracts URLs from notes based on configured URL properties
   */
  extractUrlsFromNotes(_notes: ObsidianNote[]): NoteWithUrl[] {
    // Implementation will be added in the next phase
    return [];
  }
}
