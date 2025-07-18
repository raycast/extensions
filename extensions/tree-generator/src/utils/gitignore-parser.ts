import { readFileSync, existsSync } from "fs";
import { join } from "path";

/**
 * Parse .gitignore file and return ignore patterns
 */
export class GitignoreParser {
  private patterns: string[] = [];
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.loadGitignore();
  }

  /**
   * Load and parse .gitignore file
   */
  private loadGitignore(): void {
    const gitignorePath = join(this.rootPath, ".gitignore");

    if (!existsSync(gitignorePath)) {
      return;
    }

    try {
      const content = readFileSync(gitignorePath, "utf-8");
      const lines = content.split("\n");

      this.patterns = lines
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => this.normalizePattern(line));
    } catch (error) {
      console.error("Error reading .gitignore:", error);
    }
  }

  /**
   * Normalize gitignore pattern for matching
   */
  private normalizePattern(pattern: string): string {
    // Remove leading slash
    if (pattern.startsWith("/")) {
      pattern = pattern.slice(1);
    }

    // Convert gitignore glob to regex-compatible pattern
    return pattern;
  }

  /**
   * Check if a file/directory should be ignored
   */
  public shouldIgnore(filePath: string): boolean {
    const relativePath = filePath.replace(this.rootPath + "/", "");

    return this.patterns.some((pattern) => {
      return this.matchPattern(relativePath, pattern);
    });
  }

  /**
   * Match a file path against a gitignore pattern
   */
  private matchPattern(filePath: string, pattern: string): boolean {
    // Handle directory patterns
    if (pattern.endsWith("/")) {
      const dirPattern = pattern.slice(0, -1);
      return filePath === dirPattern || filePath.startsWith(dirPattern + "/");
    }

    // Handle wildcard patterns
    if (pattern.includes("*")) {
      const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");

      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(filePath);
    }

    // Exact match or directory match
    return filePath === pattern || filePath.startsWith(pattern + "/");
  }

  /**
   * Get all loaded patterns
   */
  public getPatterns(): string[] {
    return [...this.patterns];
  }
}
