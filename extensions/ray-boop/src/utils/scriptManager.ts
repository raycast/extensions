// Simplified script manager that uses the imported script registry
// No file system access needed - all scripts are imported directly

import {
  getScript,
  searchScripts,
  scriptKeys,
  getCategories,
  getScriptsByCategory,
  executeScript,
} from "./scriptRegistry";

export class BoopScriptManager {
  /**
   * Get all available script names
   */
  static getAvailableScripts(): string[] {
    return scriptKeys;
  }

  /**
   * Get script metadata
   */
  static getScriptInfo(scriptName: string): {
    name: string;
    description: string;
    author: string;
    icon: string;
    tags: string;
    category: string;
  } | null {
    const script = getScript(scriptName);
    if (!script) return null;

    return script.metadata;
  }

  /**
   * Execute a script
   */
  static async executeScript(
    scriptName: string,
    inputText: string,
  ): Promise<{ text: string; info?: string; error?: string }> {
    return executeScript(scriptName, inputText);
  }

  /**
   * Search scripts by query
   */
  static searchScripts(query: string) {
    return searchScripts(query).map((script) => ({
      name: script.metadata.name,
      description: script.metadata.description,
      author: script.metadata.author,
      icon: script.metadata.icon,
      tags: script.metadata.tags,
      category: script.metadata.category,
    }));
  }

  /**
   * Get scripts by category
   */
  static getScriptsByCategory(category: string) {
    return getScriptsByCategory(category).map((script) => ({
      name: script.metadata.name,
      description: script.metadata.description,
      author: script.metadata.author,
      icon: script.metadata.icon,
      tags: script.metadata.tags,
      category: script.metadata.category,
    }));
  }

  /**
   * Get all categories
   */
  static getCategories(): string[] {
    return getCategories();
  }
}
