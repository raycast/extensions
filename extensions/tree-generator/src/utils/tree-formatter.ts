import { TreeNode, TreeFormatOptions } from "../types";
import { FileSystemUtils } from "./filesystem";

/**
 * Tree formatter for creating string representations of directory trees
 */
export class TreeFormatter {
  private options: TreeFormatOptions;

  constructor(options: Partial<TreeFormatOptions> = {}) {
    this.options = {
      useUnicode: true,
      showSizes: false,
      showCounts: false,
      indent: "  ",
      ...options,
    };
  }

  /**
   * Format tree nodes as a string
   */
  public formatTree(nodes: TreeNode[]): string {
    const lines: string[] = [];
    this.formatNodes(nodes, "", true, lines);
    return lines.join("\n");
  }

  /**
   * Format individual nodes recursively
   */
  private formatNodes(nodes: TreeNode[], prefix: string, isRoot: boolean, lines: string[]): void {
    const sortedNodes = this.sortNodes(nodes);

    sortedNodes.forEach((node, index) => {
      const isLast = index === sortedNodes.length - 1;
      const connector = this.getConnector(isLast, isRoot);
      const nodeText = this.formatNode(node);

      lines.push(`${prefix}${connector}${nodeText}`);

      if (node.children && node.children.length > 0) {
        const childPrefix = prefix + this.getChildPrefix(isLast, isRoot);
        this.formatNodes(node.children, childPrefix, false, lines);
      }
    });
  }

  /**
   * Sort nodes (directories first, then alphabetically)
   */
  private sortNodes(nodes: TreeNode[]): TreeNode[] {
    return [...nodes].sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get connector character for tree structure
   */
  private getConnector(isLast: boolean, isRoot: boolean): string {
    if (isRoot) return "";

    if (this.options.useUnicode) {
      return isLast ? "└── " : "├── ";
    } else {
      return isLast ? "`-- " : "|-- ";
    }
  }

  /**
   * Get prefix for child nodes
   */
  private getChildPrefix(isLast: boolean, isRoot: boolean): string {
    if (isRoot) return "";

    if (this.options.useUnicode) {
      return isLast ? "    " : "│   ";
    } else {
      return isLast ? "    " : "|   ";
    }
  }

  /**
   * Format individual node with optional size and count information
   */
  private formatNode(node: TreeNode): string {
    let text = node.name;

    if (node.isDirectory) {
      text += "/";

      if (this.options.showCounts && node.children) {
        const fileCount = this.countFiles(node.children);
        const dirCount = this.countDirectories(node.children);
        text += ` (${fileCount} files, ${dirCount} dirs)`;
      }
    } else if (this.options.showSizes && node.size !== undefined) {
      text += ` (${FileSystemUtils.formatSize(node.size)})`;
    }

    return text;
  }

  /**
   * Count files in a tree branch
   */
  private countFiles(nodes: TreeNode[]): number {
    let count = 0;

    for (const node of nodes) {
      if (!node.isDirectory) {
        count++;
      } else if (node.children) {
        count += this.countFiles(node.children);
      }
    }

    return count;
  }

  /**
   * Count directories in a tree branch
   */
  private countDirectories(nodes: TreeNode[]): number {
    let count = 0;

    for (const node of nodes) {
      if (node.isDirectory) {
        count++;
        if (node.children) {
          count += this.countDirectories(node.children);
        }
      }
    }

    return count;
  }

  /**
   * Generate tree statistics
   */
  public generateStats(nodes: TreeNode[]): {
    totalFiles: number;
    totalDirectories: number;
    totalSize: number;
  } {
    let totalFiles = 0;
    let totalDirectories = 0;
    let totalSize = 0;

    const traverse = (nodeList: TreeNode[]) => {
      for (const node of nodeList) {
        if (node.isDirectory) {
          totalDirectories++;
          if (node.children) {
            traverse(node.children);
          }
        } else {
          totalFiles++;
          totalSize += node.size || 0;
        }
      }
    };

    traverse(nodes);

    return { totalFiles, totalDirectories, totalSize };
  }
}
