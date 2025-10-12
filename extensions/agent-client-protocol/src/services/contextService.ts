/**
 * Context Service
 * Manages file context sharing for agent conversations
 */

import { v4 as uuidv4 } from "uuid";
import { ProjectContext, ProjectContextType } from "../types/entities";
import { detectLanguage, validateFilePath, sanitizeFilePath } from "../utils/fileUtils";
import { LocalStorage } from "@raycast/api";

/**
 * Storage key for project contexts
 */
const CONTEXT_STORAGE_KEY = "acp.project_contexts";

/**
 * Service for managing project context (files, directories, etc.) for agent conversations
 */
export class ContextService {
  private contexts: Map<string, ProjectContext[]>;

  constructor() {
    this.contexts = new Map();
    this.loadContexts();
  }

  /**
   * Load contexts from LocalStorage
   */
  private async loadContexts(): Promise<void> {
    try {
      const stored = await LocalStorage.getItem(CONTEXT_STORAGE_KEY);
      if (stored && typeof stored === "string") {
        const parsed = JSON.parse(stored);
        this.contexts = new Map(Object.entries(parsed));

        // Convert date strings back to Date objects
        for (const [sessionId, contexts] of this.contexts.entries()) {
          this.contexts.set(
            sessionId,
            contexts.map((ctx: any) => ({
              ...ctx,
              addedAt: new Date(ctx.addedAt),
              metadata: ctx.metadata
                ? {
                    ...ctx.metadata,
                    lastModified: ctx.metadata.lastModified ? new Date(ctx.metadata.lastModified) : undefined,
                  }
                : undefined,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Failed to load contexts from storage:", error);
      this.contexts = new Map();
    }
  }

  /**
   * Save contexts to LocalStorage
   */
  private async saveContexts(): Promise<void> {
    try {
      const toStore = Object.fromEntries(this.contexts);
      await LocalStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error("Failed to save contexts to storage:", error);
    }
  }

  /**
   * Add file context to a session
   */
  async addFileContext(sessionId: string, filePath: string, content: string): Promise<ProjectContext> {
    // Validate path
    validateFilePath(filePath);

    // Sanitize path
    const sanitizedPath = sanitizeFilePath(filePath);

    // Detect language
    const language = detectLanguage(sanitizedPath);

    // Create context
    const context: ProjectContext = {
      id: uuidv4(),
      sessionId,
      type: "file",
      path: sanitizedPath,
      content,
      language,
      addedAt: new Date(),
      size: content.length,
    };

    // Add to session contexts
    const sessionContexts = this.contexts.get(sessionId) || [];
    sessionContexts.push(context);
    this.contexts.set(sessionId, sessionContexts);

    // Persist
    await this.saveContexts();

    return context;
  }

  /**
   * Add directory context to a session
   */
  async addDirectoryContext(
    sessionId: string,
    dirPath: string,
    summary?: string
  ): Promise<ProjectContext> {
    // Validate path
    validateFilePath(dirPath);

    // Sanitize path
    const sanitizedPath = sanitizeFilePath(dirPath);

    // Create context
    const context: ProjectContext = {
      id: uuidv4(),
      sessionId,
      type: "directory",
      path: sanitizedPath,
      content: summary,
      addedAt: new Date(),
      size: summary?.length || 0,
    };

    // Add to session contexts
    const sessionContexts = this.contexts.get(sessionId) || [];
    sessionContexts.push(context);
    this.contexts.set(sessionId, sessionContexts);

    // Persist
    await this.saveContexts();

    return context;
  }

  /**
   * Add code selection context to a session
   */
  async addSelectionContext(
    sessionId: string,
    filePath: string,
    content: string,
    lineRange: { start: number; end: number }
  ): Promise<ProjectContext> {
    // Validate path
    validateFilePath(filePath);

    // Sanitize path
    const sanitizedPath = sanitizeFilePath(filePath);

    // Detect language
    const language = detectLanguage(sanitizedPath);

    // Create context
    const context: ProjectContext = {
      id: uuidv4(),
      sessionId,
      type: "selection",
      path: sanitizedPath,
      content,
      language,
      addedAt: new Date(),
      size: content.length,
      metadata: {
        lineRange,
      },
    };

    // Add to session contexts
    const sessionContexts = this.contexts.get(sessionId) || [];
    sessionContexts.push(context);
    this.contexts.set(sessionId, sessionContexts);

    // Persist
    await this.saveContexts();

    return context;
  }

  /**
   * Get all contexts for a session
   */
  async getSessionContext(sessionId: string): Promise<ProjectContext[]> {
    return this.contexts.get(sessionId) || [];
  }

  /**
   * Remove a specific context by ID
   */
  async removeContext(contextId: string): Promise<void> {
    for (const [sessionId, contexts] of this.contexts.entries()) {
      const filtered = contexts.filter((ctx) => ctx.id !== contextId);
      if (filtered.length !== contexts.length) {
        this.contexts.set(sessionId, filtered);
        await this.saveContexts();
        return;
      }
    }
  }

  /**
   * Clear all context for a session
   */
  async clearSessionContext(sessionId: string): Promise<void> {
    this.contexts.delete(sessionId);
    await this.saveContexts();
  }

  /**
   * Get total size of all context in a session
   */
  async getTotalContextSize(sessionId: string): Promise<number> {
    const contexts = await this.getSessionContext(sessionId);
    return contexts.reduce((total, ctx) => total + ctx.size, 0);
  }

  /**
   * Get context by ID
   */
  async getContextById(contextId: string): Promise<ProjectContext | undefined> {
    for (const contexts of this.contexts.values()) {
      const found = contexts.find((ctx) => ctx.id === contextId);
      if (found) {
        return found;
      }
    }
    return undefined;
  }

  /**
   * Check if session has context
   */
  async hasContext(sessionId: string): Promise<boolean> {
    const contexts = await this.getSessionContext(sessionId);
    return contexts.length > 0;
  }

  /**
   * Get context statistics for a session
   */
  async getContextStatistics(sessionId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    byType: Record<ProjectContextType, number>;
    byLanguage: Record<string, number>;
  }> {
    const contexts = await this.getSessionContext(sessionId);

    const byType: Record<ProjectContextType, number> = {
      file: 0,
      directory: 0,
      selection: 0,
    };

    const byLanguage: Record<string, number> = {};

    let totalSize = 0;

    for (const ctx of contexts) {
      byType[ctx.type]++;
      totalSize += ctx.size;

      if (ctx.language) {
        byLanguage[ctx.language] = (byLanguage[ctx.language] || 0) + 1;
      }
    }

    return {
      totalFiles: contexts.length,
      totalSize,
      byType,
      byLanguage,
    };
  }
}
