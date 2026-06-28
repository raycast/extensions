import { RegexRule, RenameResult } from "../types";
import { promises as fs } from "fs";
import path from "path";

export class RegexProcessor {
  /**
   * Apply a single regex rule to a string
   */
  static applyRule(input: string, rule: RegexRule): { result: string; applied: boolean } {
    try {
      const flags = rule.flags || "g";
      const regex = new RegExp(rule.find, flags);
      const result = input.replace(regex, rule.replace);
      const applied = result !== input;

      return { result, applied };
    } catch (error) {
      console.error(`Failed to apply rule ${rule.id}:`, error);
      return { result: input, applied: false };
    }
  }

  /**
   * Apply multiple regex rules in sequence to a string
   */
  static applyRules(input: string, rules: RegexRule[]): { result: string; appliedRules: string[] } {
    let current = input;
    const appliedRules: string[] = [];

    for (const rule of rules) {
      const { result, applied } = this.applyRule(current, rule);
      current = result;
      if (applied) {
        appliedRules.push(rule.description || rule.id);
      }
    }

    return { result: current, appliedRules };
  }

  /**
   * Check if a file path exists
   */
  static async pathExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique filename if there's a conflict
   */
  static async generateUniqueFilename(dirPath: string, baseName: string): Promise<string> {
    let finalName = baseName;
    let counter = 1;

    const extension = path.extname(baseName);
    const nameWithoutExt = path.basename(baseName, extension);

    while (await this.pathExists(path.join(dirPath, finalName))) {
      finalName = `${nameWithoutExt}-${counter}${extension}`;
      counter++;
    }

    return finalName;
  }

  /**
   * Process a single file/folder with the given rules
   */
  static async processItem(itemPath: string, rules: RegexRule[]): Promise<RenameResult> {
    try {
      const dirPath = path.dirname(itemPath);
      const originalName = path.basename(itemPath);

      // Apply regex rules
      const { result: newName, appliedRules } = this.applyRules(originalName, rules);

      // If no changes were made, skip
      if (originalName === newName) {
        return {
          success: true,
          originalPath: itemPath,
          originalName,
          newPath: itemPath,
          newName: originalName,
          appliedRules: [],
        };
      }

      // Generate unique filename if there's a conflict
      const uniqueNewName = await this.generateUniqueFilename(dirPath, newName);
      const newPath = path.join(dirPath, uniqueNewName);

      // Perform the rename
      await fs.rename(itemPath, newPath);

      return {
        success: true,
        originalPath: itemPath,
        originalName,
        newPath,
        newName: uniqueNewName,
        appliedRules,
      };
    } catch (error) {
      return {
        success: false,
        originalPath: itemPath,
        originalName: path.basename(itemPath),
        error: error instanceof Error ? error.message : "Unknown error",
        appliedRules: [],
      };
    }
  }

  /**
   * Preview what changes would be made without actually renaming
   */
  static previewChanges(
    filenames: string[],
    rules: RegexRule[],
  ): Array<{
    original: string;
    preview: string;
    appliedRules: string[];
    hasChanges: boolean;
  }> {
    return filenames.map((filename) => {
      const { result: preview, appliedRules } = this.applyRules(filename, rules);
      return {
        original: filename,
        preview,
        appliedRules,
        hasChanges: filename !== preview,
      };
    });
  }
}
