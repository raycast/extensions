import { promises as fs } from "fs";
import matter from "gray-matter";

type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | FrontmatterValue[]
  | { [key: string]: FrontmatterValue };

interface FrontmatterData {
  data: Record<string, FrontmatterValue>;
  content: string;
}

export class FrontmatterReader {
  private readonly INITIAL_CHUNK_SIZE = 4096; // 4KB
  private readonly MAX_FRONTMATTER_SIZE = 65536; // 64KB

  /**
   * Efficiently reads only the frontmatter portion of a markdown file
   * by reading chunks until the closing delimiter is found
   */
  async readFrontmatter(filePath: string): Promise<FrontmatterData> {
    const fd = await fs.open(filePath, "r");

    try {
      const buffer = Buffer.alloc(this.INITIAL_CHUNK_SIZE);
      let content = "";
      let position = 0;

      // Read chunks until we find the complete frontmatter
      while (position < this.MAX_FRONTMATTER_SIZE) {
        const { bytesRead } = await fd.read(buffer, 0, buffer.length, position);

        if (bytesRead === 0) {
          // End of file reached
          break;
        }

        content += buffer.toString("utf8", 0, bytesRead);

        // Check if we have complete frontmatter
        if (this.hasCompleteFrontmatter(content)) {
          // Parse only the frontmatter portion
          return this.parseFrontmatter(content);
        }

        position += bytesRead;
      }

      // If we reach here, either:
      // 1. File has no frontmatter
      // 2. Frontmatter is incomplete or too large
      // Parse what we have
      return this.parseFrontmatter(content);
    } finally {
      await fd.close();
    }
  }

  /**
   * Check if the content contains complete frontmatter delimiters
   */
  private hasCompleteFrontmatter(content: string): boolean {
    // Frontmatter must start with ---
    if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
      // No frontmatter, we can stop reading
      return true;
    }

    // Look for the closing --- after the opening one
    const firstDelimiterEnd = content.indexOf("\n") + 1;
    const secondDelimiterIndex = content.indexOf("\n---\n", firstDelimiterEnd);
    const secondDelimiterIndexCRLF = content.indexOf(
      "\r\n---\r\n",
      firstDelimiterEnd
    );

    // Check if we found a closing delimiter
    if (secondDelimiterIndex !== -1 || secondDelimiterIndexCRLF !== -1) {
      // We have complete frontmatter
      return true;
    }

    // Check if content ends with --- (edge case)
    if (content.endsWith("\n---\n") || content.endsWith("\r\n---\r\n")) {
      return true;
    }

    return false;
  }

  /**
   * Parse frontmatter from the content
   */
  private parseFrontmatter(content: string): FrontmatterData {
    try {
      // Use gray-matter to parse, but only feed it the frontmatter portion
      const endIndex = this.findFrontmatterEnd(content);

      if (endIndex !== -1) {
        // Extract only up to the end of frontmatter
        const frontmatterContent = content.substring(0, endIndex);
        return matter(frontmatterContent);
      }

      // Let gray-matter handle it
      return matter(content);
    } catch (error) {
      // If parsing fails, return empty frontmatter
      return { data: {}, content: "" };
    }
  }

  /**
   * Find the end index of frontmatter in content
   */
  private findFrontmatterEnd(content: string): number {
    if (!content.startsWith("---")) {
      return -1;
    }

    // Find the second --- delimiter
    const firstNewline = content.indexOf("\n");
    if (firstNewline === -1) return -1;

    const secondDelimiter = content.indexOf("\n---\n", firstNewline + 1);
    const secondDelimiterCRLF = content.indexOf(
      "\r\n---\r\n",
      firstNewline + 1
    );

    if (secondDelimiter !== -1) {
      return secondDelimiter + 5; // Include the closing ---\n
    }

    if (secondDelimiterCRLF !== -1) {
      return secondDelimiterCRLF + 7; // Include the closing ---\r\n
    }

    return -1;
  }

  /**
   * Read full file content (fallback for when we need the entire file)
   */
  async readFullFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, "utf-8");
  }
}
