import { getPreferenceValues } from "@raycast/api";
import { TreeGeneratorOptions } from "../types";

interface Preferences {
  // Generate Tree preferences
  generateTreeMaxDepth: string;
  generateTreeRespectGitignore: boolean;
  generateTreeShowHidden: boolean;
  generateTreeDirectoriesOnly: boolean;
  generateTreeShowSizes: boolean;
  generateTreeShowCounts: boolean;
  generateTreeIgnorePatterns: string;

  // Quick Tree preferences
  quickTreeMaxDepth: string;
  quickTreeRespectGitignore: boolean;
  quickTreeShowHidden: boolean;
  quickTreeDirectoriesOnly: boolean;
  quickTreeShowSizes: boolean;
  quickTreeShowCounts: boolean;
  quickTreeIgnorePatterns: string;
}

/**
 * Utility functions for handling extension preferences
 */
export class PreferenceUtils {
  /**
   * Get all preferences
   */
  static getPreferences(): Preferences {
    return getPreferenceValues<Preferences>();
  }

  /**
   * Get quick tree options from preferences
   */
  static getQuickTreeOptions(rootPath: string): TreeGeneratorOptions {
    const prefs = this.getPreferences();

    return {
      maxDepth: Math.max(1, parseInt(prefs.quickTreeMaxDepth) || 3),
      respectGitignore: prefs.quickTreeRespectGitignore,
      showHidden: prefs.quickTreeShowHidden,
      directoriesOnly: prefs.quickTreeDirectoriesOnly,
      showSizes: prefs.quickTreeShowSizes,
      showCounts: prefs.quickTreeShowCounts,
      ignorePatterns: this.parseIgnorePatterns(prefs.quickTreeIgnorePatterns),
      rootPath,
    };
  }

  /**
   * Get default tree options from preferences for Generate Directory Tree
   */
  static getDefaultTreeOptions(rootPath: string): TreeGeneratorOptions {
    const prefs = this.getPreferences();

    return {
      maxDepth: Math.max(1, parseInt(prefs.generateTreeMaxDepth) || 3),
      respectGitignore: prefs.generateTreeRespectGitignore,
      showHidden: prefs.generateTreeShowHidden,
      directoriesOnly: prefs.generateTreeDirectoriesOnly,
      showSizes: prefs.generateTreeShowSizes,
      showCounts: prefs.generateTreeShowCounts,
      ignorePatterns: this.parseIgnorePatterns(prefs.generateTreeIgnorePatterns),
      rootPath,
    };
  }

  /**
   * Parse ignore patterns from preference string
   * Supports both pipe-separated (for preferences) and newline-separated (for form textarea)
   */
  private static parseIgnorePatterns(patternsString: string): string[] {
    if (!patternsString) {
      return [];
    }

    // Check if it contains pipe characters (from preferences)
    if (patternsString.includes("|")) {
      return patternsString
        .split("|")
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern.length > 0);
    }

    // Otherwise assume newline-separated (from form textarea)
    return patternsString
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  /**
   * Format ignore patterns for display in textarea (newline-separated)
   */
  static formatIgnorePatternsForDisplay(patterns: string[]): string {
    return patterns.join("\n");
  }

  /**
   * Format ignore patterns for preferences (pipe-separated)
   */
  static formatIgnorePatternsForPreferences(patterns: string[]): string {
    return patterns.join("|");
  }

  /**
   * Get default ignore patterns from preferences for Generate Directory Tree
   */
  static getDefaultGenerateTreeIgnorePatterns(): string[] {
    const prefs = this.getPreferences();
    return this.parseIgnorePatterns(prefs.generateTreeIgnorePatterns);
  }

  /**
   * Get default ignore patterns from preferences for Quick Directory Tree
   */
  static getDefaultQuickTreeIgnorePatterns(): string[] {
    const prefs = this.getPreferences();
    return this.parseIgnorePatterns(prefs.quickTreeIgnorePatterns);
  }
}
