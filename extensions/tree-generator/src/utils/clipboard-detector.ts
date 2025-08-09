import { Clipboard } from "@raycast/api";
import { TreeParser } from "./tree-parser";
import { ParsedTreeNode } from "../types";

/**
 * Utility for detecting and retrieving tree structures from clipboard history
 */
export class ClipboardDetector {
  private static readonly MAX_HISTORY_ITEMS = 6; // Raycast supports offset 0-5

  /**
   * Search through clipboard history for tree structures
   * @returns Array of detected tree strings with their metadata
   */
  public static async searchClipboardForTrees(): Promise<ClipboardTreeItem[]> {
    const treeItems: ClipboardTreeItem[] = [];

    // Search through clipboard history (offset 0-5)
    for (let offset = 0; offset < this.MAX_HISTORY_ITEMS; offset++) {
      try {
        const clipboardContent = await Clipboard.readText({ offset });

        if (!clipboardContent) continue;

        // Check if this content looks like a tree structure
        if (TreeParser.isValidTreeString(clipboardContent)) {
          // Try to parse it to get more details
          const nodes = TreeParser.parseTreeString(clipboardContent);

          if (nodes.length > 0) {
            treeItems.push({
              content: clipboardContent,
              offset,
              nodeCount: this.countNodes(nodes),
              fileCount: this.countFiles(nodes),
              directoryCount: this.countDirectories(nodes),
              preview: this.generatePreview(clipboardContent),
              timestamp: new Date(), // We can't get actual timestamp from Raycast API
            });
          }
        }
      } catch {
        // Ignore errors (might be due to offset out of range or permission issues)
        continue;
      }
    }

    return treeItems;
  }

  /**
   * Get the most recent tree structure from clipboard
   */
  public static async getMostRecentTree(): Promise<string | null> {
    const trees = await this.searchClipboardForTrees();

    if (trees.length === 0) return null;

    // Return the most recent one (lowest offset)
    return trees.sort((a, b) => a.offset - b.offset)[0].content;
  }

  /**
   * Check if current clipboard contains a tree structure
   */
  public static async hasTreeInCurrentClipboard(): Promise<boolean> {
    try {
      const currentContent = await Clipboard.readText();
      if (!currentContent) return false;

      return TreeParser.isValidTreeString(currentContent);
    } catch {
      return false;
    }
  }

  /**
   * Get current clipboard content if it's a tree structure
   */
  public static async getCurrentClipboardTree(): Promise<string | null> {
    try {
      const currentContent = await Clipboard.readText();
      if (!currentContent) return null;

      if (TreeParser.isValidTreeString(currentContent)) {
        return currentContent;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generic function to count nodes based on a predicate
   */
  private static countNodesByPredicate(nodes: ParsedTreeNode[], predicate: (node: ParsedTreeNode) => boolean): number {
    let count = 0;

    function countRecursive(nodeList: ParsedTreeNode[]): void {
      for (const node of nodeList) {
        if (predicate(node)) {
          count++;
        }
        if (node.children && node.children.length > 0) {
          countRecursive(node.children);
        }
      }
    }

    countRecursive(nodes);
    return count;
  }

  /**
   * Count total nodes in parsed tree
   */
  private static countNodes(nodes: ParsedTreeNode[]): number {
    return this.countNodesByPredicate(nodes, () => true);
  }

  /**
   * Count files in parsed tree
   */
  private static countFiles(nodes: ParsedTreeNode[]): number {
    return this.countNodesByPredicate(nodes, (node) => !node.isDirectory);
  }

  /**
   * Count directories in parsed tree
   */
  private static countDirectories(nodes: ParsedTreeNode[]): number {
    return this.countNodesByPredicate(nodes, (node) => node.isDirectory);
  }

  /**
   * Generate a preview of the tree content
   */
  private static generatePreview(content: string): string {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const maxLines = 5;

    if (lines.length <= maxLines) {
      return content;
    }

    const preview = lines.slice(0, maxLines).join("\n");
    const remaining = lines.length - maxLines;

    return `${preview}\n... (${remaining} more lines)`;
  }
}

/**
 * Represents a tree structure found in clipboard
 */
export interface ClipboardTreeItem {
  content: string;
  offset: number;
  nodeCount: number;
  fileCount: number;
  directoryCount: number;
  preview: string;
  timestamp: Date;
}
