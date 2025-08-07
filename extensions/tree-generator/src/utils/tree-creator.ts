import { promises as fs } from "fs";
import { join, dirname } from "path";
import { ParsedTreeNode, TreeCreationOptions, TreeCreationResult } from "../types";
import { FileSystemUtils } from "./filesystem";

/**
 * Generator for creating files and directories from parsed tree structure
 */
export class TreeCreator {
  private options: TreeCreationOptions;
  private result: TreeCreationResult;

  constructor(options: TreeCreationOptions) {
    this.options = options;
    this.result = {
      directoriesCreated: 0,
      filesCreated: 0,
      itemsSkipped: 0,
      creationTime: 0,
      createdPaths: [],
      skippedPaths: [],
      hasErrors: false,
      errors: [],
    };
  }

  /**
   * Create files and directories from parsed tree nodes
   */
  public async createFromTree(nodes: ParsedTreeNode[]): Promise<TreeCreationResult> {
    const startTime = Date.now();
    this.resetResult();

    try {
      // Ensure root directory exists
      await this.ensureDirectoryExists(this.options.rootPath);

      // Create all nodes
      await this.createNodes(nodes, this.options.rootPath);

      this.result.creationTime = Date.now() - startTime;
      return this.result;
    } catch (error) {
      this.result.hasErrors = true;
      this.result.errors.push(`Failed to create tree structure: ${error}`);
      this.result.creationTime = Date.now() - startTime;
      return this.result;
    }
  }

  /**
   * Recursively create nodes (files and directories)
   */
  private async createNodes(nodes: ParsedTreeNode[], parentPath: string): Promise<void> {
    for (const node of nodes) {
      const itemPath = join(parentPath, node.name);

      try {
        if (node.isDirectory) {
          await this.createDirectory(itemPath);
          // Recursively create children
          if (node.children.length > 0) {
            await this.createNodes(node.children, itemPath);
          }
        } else if (!this.options.directoriesOnly) {
          // Only create files if directoriesOnly option is false
          await this.createFile(itemPath);
        }
      } catch (error) {
        this.result.hasErrors = true;
        this.result.errors.push(`Failed to create ${itemPath}: ${error}`);
      }
    }
  }

  /**
   * Create a directory
   */
  private async createDirectory(dirPath: string): Promise<void> {
    try {
      const exists = await FileSystemUtils.pathExists(dirPath);

      if (exists) {
        this.result.itemsSkipped++;
        this.result.skippedPaths.push(dirPath);
        return;
      }

      await fs.mkdir(dirPath, { recursive: true });
      this.result.directoriesCreated++;
      this.result.createdPaths.push(dirPath);
    } catch (error) {
      throw new Error(`Cannot create directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Create a file
   */
  private async createFile(filePath: string): Promise<void> {
    try {
      const exists = await FileSystemUtils.pathExists(filePath);

      if (exists && !this.options.overwriteExisting) {
        this.result.itemsSkipped++;
        this.result.skippedPaths.push(filePath);
        return;
      }

      // Ensure parent directory exists
      const parentDir = dirname(filePath);
      await this.ensureDirectoryExists(parentDir);

      // Create file with empty content
      await fs.writeFile(filePath, "", "utf8");
      this.result.filesCreated++;
      this.result.createdPaths.push(filePath);
    } catch (error) {
      throw new Error(`Cannot create file ${filePath}: ${error}`);
    }
  }

  /**
   * Ensure a directory exists
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const exists = await FileSystemUtils.pathExists(dirPath);
      if (!exists) {
        await fs.mkdir(dirPath, { recursive: true });
      }
    } catch (error) {
      throw new Error(`Cannot ensure directory exists ${dirPath}: ${error}`);
    }
  }

  /**
   * Reset result counters
   */
  private resetResult(): void {
    this.result = {
      directoriesCreated: 0,
      filesCreated: 0,
      itemsSkipped: 0,
      creationTime: 0,
      createdPaths: [],
      skippedPaths: [],
      hasErrors: false,
      errors: [],
    };
  }

  /**
   * Validate tree structure before creation
   */
  public static validateTreeStructure(nodes: ParsedTreeNode[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const validateNodes = (nodeList: ParsedTreeNode[], path = ""): void => {
      for (const node of nodeList) {
        const currentPath = path ? `${path}/${node.name}` : node.name;

        // Check for invalid characters in names
        if (TreeCreator.hasInvalidPathCharacters(node.name)) {
          errors.push(`Invalid characters in name: ${currentPath}`);
        }

        // Check for reserved names (Windows)
        if (TreeCreator.isReservedName(node.name)) {
          errors.push(`Reserved name not allowed: ${currentPath}`);
        }

        // Recursively validate children
        if (node.isDirectory && node.children.length > 0) {
          validateNodes(node.children, currentPath);
        }
      }
    };

    validateNodes(nodes);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if a name contains invalid path characters
   */
  private static hasInvalidPathCharacters(name: string): boolean {
    // Common invalid characters for file/directory names
    const invalidChars = /[<>:"|?*]/;
    // Check for control characters separately
    const hasControlChars = name.split("").some((char) => {
      const code = char.charCodeAt(0);
      return code >= 0 && code <= 31;
    });
    return invalidChars.test(name) || hasControlChars;
  }

  /**
   * Check if a name is reserved (Windows reserved names)
   */
  private static isReservedName(name: string): boolean {
    const reservedNames = [
      "CON",
      "PRN",
      "AUX",
      "NUL",
      "COM1",
      "COM2",
      "COM3",
      "COM4",
      "COM5",
      "COM6",
      "COM7",
      "COM8",
      "COM9",
      "LPT1",
      "LPT2",
      "LPT3",
      "LPT4",
      "LPT5",
      "LPT6",
      "LPT7",
      "LPT8",
      "LPT9",
    ];

    const nameUpper = name.toUpperCase();
    return reservedNames.includes(nameUpper) || reservedNames.some((reserved) => nameUpper.startsWith(reserved + "."));
  }

  /**
   * Preview what would be created without actually creating anything
   */
  public async previewCreation(nodes: ParsedTreeNode[]): Promise<{
    directoriesToCreate: string[];
    filesToCreate: string[];
    existingPaths: string[];
  }> {
    const directoriesToCreate: string[] = [];
    const filesToCreate: string[] = [];
    const existingPaths: string[] = [];

    const previewNodes = async (nodeList: ParsedTreeNode[], parentPath: string): Promise<void> => {
      for (const node of nodeList) {
        const itemPath = join(parentPath, node.name);
        const exists = await FileSystemUtils.pathExists(itemPath);

        if (exists) {
          existingPaths.push(itemPath);
        } else if (node.isDirectory) {
          directoriesToCreate.push(itemPath);
        } else if (!this.options.directoriesOnly) {
          // Only include files in preview if directoriesOnly option is false
          filesToCreate.push(itemPath);
        }

        // Recursively preview children
        if (node.isDirectory && node.children.length > 0) {
          await previewNodes(node.children, itemPath);
        }
      }
    };

    await previewNodes(nodes, this.options.rootPath);

    return {
      directoriesToCreate,
      filesToCreate,
      existingPaths,
    };
  }
}
