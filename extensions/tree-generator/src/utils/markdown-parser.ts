import { ParsedTreeNode } from "../types";

/**
 * Parser for markdown list structures to convert them to tree format
 */
export class MarkdownParser {
  /**
   * Parse markdown list into tree nodes
   */
  public static parseMarkdownList(markdownText: string): ParsedTreeNode[] {
    // Use the smart parsing method by default
    return this.parseMarkdownListSmart(markdownText);
  }

  /**
   * Parse markdown list into tree nodes with smart indentation detection
   */
  public static parseMarkdownListSmart(markdownText: string): ParsedTreeNode[] {
    const lines = markdownText.split("\n").filter((line) => line.trim().length > 0);

    // First, parse all lines and collect indentation info
    const lineData: Array<{ name: string; rawIndent: number; content: string; isDirectory: boolean }> = [];

    for (const line of lines) {
      const parsed = this.parseMarkdownLineRaw(line);
      if (parsed) {
        lineData.push(parsed);
      }
    }

    if (lineData.length === 0) return [];

    // Smart depth calculation based on actual indentation levels
    const indentLevels = [...new Set(lineData.map((l) => l.rawIndent))].sort((a, b) => a - b);

    // Calculate smart depths
    const smartLines = lineData.map((line) => ({
      name: line.name,
      depth: indentLevels.indexOf(line.rawIndent),
      isDirectory: line.isDirectory,
      content: line.content,
    }));

    // Determine directories based on context
    for (let i = 0; i < smartLines.length; i++) {
      const current = smartLines[i];

      // Check if this node has children (next node has deeper depth)
      const hasChildren = i < smartLines.length - 1 && smartLines[i + 1].depth > current.depth;

      // If it has children or was explicitly marked as directory, it's a directory
      if (hasChildren || current.isDirectory) {
        current.isDirectory = true;
      }
    }

    // Build tree structure
    const rootNodes: ParsedTreeNode[] = [];
    const nodeStack: Array<{ node: ParsedTreeNode; depth: number }> = [];

    for (const lineData of smartLines) {
      const { name, depth, isDirectory } = lineData;

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
   * Parse a single markdown line without depth calculation
   */
  private static parseMarkdownLineRaw(
    line: string,
  ): { name: string; rawIndent: number; content: string; isDirectory: boolean } | null {
    if (!line.trim()) return null;

    // Match unordered list patterns: -, *, +
    const unorderedMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    if (unorderedMatch) {
      const indentation = unorderedMatch[1];
      const content = unorderedMatch[3].trim();

      const parsed = this.parseContent(content, 0);
      return {
        name: parsed.name,
        rawIndent: indentation.length,
        content,
        isDirectory: parsed.isDirectory,
      };
    }

    // Match ordered list patterns: 1., 2., etc.
    const orderedMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (orderedMatch) {
      const indentation = orderedMatch[1];
      const content = orderedMatch[2].trim();

      const parsed = this.parseContent(content, 0);
      return {
        name: parsed.name,
        rawIndent: indentation.length,
        content,
        isDirectory: parsed.isDirectory,
      };
    }

    return null;
  }

  /**
   * Parse a single markdown line (legacy method for compatibility)
   */
  private static parseMarkdownLine(line: string): { name: string; depth: number; isDirectory: boolean } | null {
    const raw = this.parseMarkdownLineRaw(line);
    if (!raw) return null;

    return {
      name: raw.name,
      depth: Math.floor(raw.rawIndent / 4), // Fallback to 4-space indentation
      isDirectory: raw.isDirectory,
    };
  }

  /**
   * Parse content to determine if it's a directory and clean the name
   */
  private static parseContent(content: string, depth: number): { name: string; depth: number; isDirectory: boolean } {
    let name = content;
    let isDirectory = false;

    // Check if it ends with / (directory indicator)
    if (content.endsWith("/") || content.endsWith("\\")) {
      isDirectory = true;
      name = content.replace(/[/\\]$/, "");
    } else if (this.isLikelyDirectory(content)) {
      // Infer if it's likely a directory based on patterns
      isDirectory = true;
    }

    return { name, depth, isDirectory };
  }

  /**
   * Determine if content is likely a directory based on common patterns
   */
  private static isLikelyDirectory(content: string): boolean {
    // If it has a file extension, it's likely a file
    if (/\.[a-zA-Z0-9]+$/.test(content)) {
      return false;
    }

    // If it doesn't have an extension and doesn't contain obvious file indicators,
    // it's likely a directory (especially for non-English names)

    // Common file indicators that would make it NOT a directory
    const fileIndicators = [
      /\.(js|ts|py|java|cpp|c|h|html|css|json|xml|txt|md|yml|yaml)$/i, // common extensions
      /^[A-Z_]+\.(env|config|lock)$/i, // config files
      /README|LICENSE|CHANGELOG/i, // common files without extensions
      /Makefile|Dockerfile/i, // specific files
    ];

    // If it matches file indicators, it's a file
    if (fileIndicators.some((pattern) => pattern.test(content))) {
      return false;
    }

    // For everything else (including Chinese/Unicode text), assume it's a directory
    // unless it has a clear file extension
    return true;
  }

  /**
   * Validate if markdown text contains list structures
   */
  public static isValidMarkdownList(markdownText: string): boolean {
    const lines = markdownText.split("\n").filter((line) => line.trim().length > 0);

    if (lines.length === 0) return false;

    // Check if at least some lines are list items
    let listItemCount = 0;
    for (const line of lines) {
      if (line.match(/^\s*([-*+]|\d+\.)\s+.+$/)) {
        listItemCount++;
      }
    }

    // At least 50% of lines should be list items
    return listItemCount >= Math.ceil(lines.length * 0.5);
  }
}
