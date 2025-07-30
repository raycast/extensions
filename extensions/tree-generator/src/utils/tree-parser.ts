import { ParsedTreeNode } from "../types";

/**
 * Parser for directory tree strings
 */
export class TreeParser {
  private static readonly TREE_CHARS = ["├──", "└──", "│", "├─", "└─", "├", "└", "|-", "`-"];
  private static readonly DIRECTORY_INDICATORS = ["/", "\\"];

  /**
   * Parse a tree string into a structured format
   */
  public static parseTreeString(treeString: string): ParsedTreeNode[] {
    const lines = treeString.split("\n").filter((line) => line.trim().length > 0);
    const rootNodes: ParsedTreeNode[] = [];
    const nodeStack: Array<{ node: ParsedTreeNode; depth: number }> = [];

    for (const line of lines) {
      const parsed = this.parseLine(line);
      if (!parsed) continue;

      const { name, depth, isDirectory } = parsed;

      const node: ParsedTreeNode = {
        name,
        isDirectory,
        depth,
        children: [],
      };

      // Find the correct parent based on depth
      while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].depth >= depth) {
        nodeStack.pop();
      }

      if (nodeStack.length === 0) {
        // Root level node
        rootNodes.push(node);
      } else {
        // Child node
        const parent = nodeStack[nodeStack.length - 1].node;
        parent.children.push(node);
      }

      // Add to stack if it's a directory (potential parent)
      if (isDirectory) {
        nodeStack.push({ node, depth });
      }
    }

    return rootNodes;
  }

  /**
   * Parse a single line of tree output
   */
  private static parseLine(line: string): { name: string; depth: number; isDirectory: boolean } | null {
    if (!line.trim()) return null;

    // Remove leading whitespace
    const trimmedLine = line.trimStart();
    let cleanLine = trimmedLine;

    // Calculate depth based on tree structure
    let depth = 0;

    // Count depth by analyzing the tree structure
    // Look for patterns like "│   ", "├── ", "└── ", etc.
    const depthMatch = line.match(/^(\s*(?:[│\s]*(?:├|└)[─\s]*)*)/);
    if (depthMatch) {
      const prefix = depthMatch[1];
      // Count the number of tree levels by counting ├ or └ characters
      const treeChars = (prefix.match(/[├└]/g) || []).length;
      if (treeChars > 0) {
        depth = treeChars - 1; // The current item is at this depth
      } else {
        // Fallback: count pipe characters (│) which indicate continuation lines
        const pipeCount = (prefix.match(/[│]/g) || []).length;
        depth = pipeCount;
      }
    }

    // Remove tree drawing characters
    for (const char of this.TREE_CHARS) {
      if (cleanLine.startsWith(char)) {
        cleanLine = cleanLine.substring(char.length).trim();
        break;
      }
    }

    // Handle cases where tree chars are preceded by spaces/pipes
    cleanLine = cleanLine.replace(/^[│\s]*/, "").trim();

    if (!cleanLine) return null;

    // Check if it's a directory
    let isDirectory = false;
    let name = cleanLine;

    // Check for directory indicators
    if (this.DIRECTORY_INDICATORS.some((indicator) => cleanLine.endsWith(indicator))) {
      isDirectory = true;
      name = cleanLine.replace(/[/\\]$/, "");
    }

    // Special case: if the name contains common directory patterns
    if (this.isLikelyDirectory(name)) {
      isDirectory = true;
    }

    return { name, depth, isDirectory };
  }

  /**
   * Determine if a name is likely to be a directory based on common patterns
   */
  private static isLikelyDirectory(name: string): boolean {
    // Common directory patterns
    const directoryPatterns = [
      /^[a-z]+$/, // lowercase words (src, lib, etc.)
      /^[A-Z][a-z]+$/, // PascalCase (Components, Utils, etc.)
      /^[a-z]+-[a-z]+/, // kebab-case (my-component, etc.)
      /^[a-z]+_[a-z]+/, // snake_case (my_module, etc.)
      /^\./, // hidden directories (.git, .vscode, etc.)
    ];

    // If it has an extension, it's likely a file
    if (/\.[a-zA-Z0-9]+$/.test(name)) {
      return false;
    }

    return directoryPatterns.some((pattern) => pattern.test(name));
  }

  /**
   * Validate if a string looks like a directory tree
   */
  public static isValidTreeString(treeString: string): boolean {
    const lines = treeString.split("\n").filter((line) => line.trim().length > 0);

    if (lines.length === 0) return false;

    // Check if at least some lines contain tree characters
    let hasTreeChars = false;
    for (const line of lines.slice(0, Math.min(10, lines.length))) {
      if (this.TREE_CHARS.some((char) => line.includes(char))) {
        hasTreeChars = true;
        break;
      }
    }

    return hasTreeChars;
  }

  /**
   * Normalize tree string (remove extra whitespace, ensure consistent format)
   */
  public static normalizeTreeString(treeString: string): string {
    return treeString
      .split("\n")
      .map((line) => line.trimEnd())
      .filter((line) => line.trim().length > 0)
      .join("\n");
  }
}
