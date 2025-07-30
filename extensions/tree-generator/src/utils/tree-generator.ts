import { TreeGeneratorOptions, TreeNode, TreeGenerationResult } from "../types";
import { GitignoreParser } from "./gitignore-parser";
import { FileSystemUtils } from "./filesystem";
import { TreeFormatter } from "./tree-formatter";

/**
 * Main tree generator class
 */
export class TreeGenerator {
  private options: TreeGeneratorOptions;
  private gitignoreParser?: GitignoreParser;
  private formatter: TreeFormatter;
  private totalSkippedCount = 0;

  constructor(options: TreeGeneratorOptions) {
    this.options = options;

    if (options.respectGitignore) {
      this.gitignoreParser = new GitignoreParser(options.rootPath);
    }

    this.formatter = new TreeFormatter({
      showSizes: options.showSizes,
      showCounts: options.showCounts,
    });
  }

  /**
   * Generate directory tree
   */
  public async generateTree(): Promise<TreeGenerationResult> {
    const startTime = Date.now();
    this.totalSkippedCount = 0; // Reset counter

    try {
      const tree = await this.buildTree(this.options.rootPath, 0);
      const treeString = this.formatter.formatTree(tree);
      const stats = this.formatter.generateStats(tree);
      const generationTime = Date.now() - startTime;

      return {
        tree,
        treeString,
        fileCount: stats.totalFiles,
        dirCount: stats.totalDirectories,
        totalSize: stats.totalSize,
        generationTime,
        skippedCount: this.totalSkippedCount,
        hasErrors: this.totalSkippedCount > 0,
      };
    } catch (error) {
      throw new Error(`Failed to generate tree: ${error}`);
    }
  }

  /**
   * Recursively build tree structure
   */
  private async buildTree(dirPath: string, depth: number): Promise<TreeNode[]> {
    if (depth >= this.options.maxDepth) {
      return [];
    }

    try {
      const result = await FileSystemUtils.getDirectoryContents(dirPath);
      const { contents, skippedCount } = result;
      this.totalSkippedCount += skippedCount;
      const nodes: TreeNode[] = [];

      for (const item of contents) {
        // Skip hidden files if not requested
        if (!this.options.showHidden && FileSystemUtils.isHidden(item.name)) {
          continue;
        }

        // Skip if matches gitignore patterns
        if (this.gitignoreParser && this.gitignoreParser.shouldIgnore(item.path)) {
          continue;
        }

        // Skip if matches custom ignore patterns
        if (this.matchesIgnorePatterns(item.name)) {
          continue;
        }

        // Skip files if directories only mode
        if (this.options.directoriesOnly && !item.isDirectory) {
          continue;
        }

        const node: TreeNode = {
          name: item.name,
          path: item.path,
          isDirectory: item.isDirectory,
          size: item.size,
          depth,
        };

        // Recursively build children for directories
        if (item.isDirectory) {
          const accessible = await FileSystemUtils.isAccessible(item.path);
          if (accessible) {
            node.children = await this.buildTree(item.path, depth + 1);
          } else {
            // Mark as inaccessible directory
            node.children = [];
          }
        }

        nodes.push(node);
      }

      return nodes;
    } catch (error) {
      throw new Error(`Cannot read directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Check if file matches custom ignore patterns
   */
  private matchesIgnorePatterns(fileName: string): boolean {
    return this.options.ignorePatterns.some((pattern) => {
      // Simple glob pattern matching
      if (pattern.includes("*")) {
        const regexPattern = pattern.replace(/\./g, "\\.").replace(/\*/g, ".*").replace(/\?/g, ".");
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(fileName);
      }

      return fileName === pattern;
    });
  }

  /**
   * Update generator options
   */
  public updateOptions(newOptions: Partial<TreeGeneratorOptions>): void {
    this.options = { ...this.options, ...newOptions };

    // Reinitialize gitignore parser if needed
    if (newOptions.respectGitignore !== undefined) {
      if (newOptions.respectGitignore) {
        this.gitignoreParser = new GitignoreParser(this.options.rootPath);
      } else {
        this.gitignoreParser = undefined;
      }
    }

    // Update formatter
    this.formatter = new TreeFormatter({
      showSizes: this.options.showSizes,
      showCounts: this.options.showCounts,
    });
  }
}
