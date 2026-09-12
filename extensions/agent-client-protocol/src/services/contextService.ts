/**
 * Context Service
 * Manages file context sharing for agent conversations
 */

import { LocalStorage, Alert, confirmAlert } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import type { Dirent } from "fs";
import { readFile, readdir, stat } from "fs/promises";
import { ConfigService } from "./configService";
import {
  detectLanguage,
  validateFilePath,
  sanitizeFilePath,
  truncateContent,
  isWithinAllowedDirectory,
  getParentDirectory,
} from "@/utils/fileUtils";
import { ProjectContext, ProjectContextType } from "@/types/entities";
import { STORAGE_KEYS } from "@/utils/storageKeys";
import { createLogger } from "@/utils/logging";

const logger = createLogger("ContextService");

const CONTEXT_STORAGE_KEY = STORAGE_KEYS.PROJECT_CONTEXTS;
const MAX_FILE_CONTEXT_BYTES = 64 * 1024; // 64KB per shared file
const DIRECTORY_SUMMARY_LIMIT = 20;

export class ContextService {
  private contexts: Map<string, ProjectContext[]> = new Map();

  constructor(private configService: ConfigService = new ConfigService()) {
    void this.loadContexts();
  }

  /**
   * Load contexts from LocalStorage
   */
  private async loadContexts(): Promise<void> {
    try {
      const stored = await LocalStorage.getItem<string>(CONTEXT_STORAGE_KEY);
      if (!stored) {
        this.contexts = new Map();
        return;
      }

      const parsed = JSON.parse(stored) as Record<string, ProjectContext[]>;

      this.contexts = new Map(
        Object.entries(parsed).map(([sessionId, contexts]) => [
          sessionId,
          contexts.map((ctx) => ({
            ...ctx,
            addedAt: new Date(ctx.addedAt),
            metadata: ctx.metadata
              ? {
                  ...ctx.metadata,
                  lastModified: ctx.metadata.lastModified ? new Date(ctx.metadata.lastModified) : undefined,
                }
              : undefined,
          })),
        ]),
      );
    } catch (error) {
      logger.error("Failed to load contexts from storage", { error });
      this.contexts = new Map();
    }
  }

  /**
   * Persist contexts to LocalStorage
   */
  private async saveContexts(): Promise<void> {
    try {
      const serializable = Object.fromEntries(
        Array.from(this.contexts.entries()).map(([sessionId, contexts]) => [
          sessionId,
          contexts.map((ctx) => ({
            ...ctx,
            addedAt: ctx.addedAt instanceof Date ? ctx.addedAt.toISOString() : ctx.addedAt,
            metadata: ctx.metadata
              ? {
                  ...ctx.metadata,
                  lastModified:
                    ctx.metadata.lastModified instanceof Date
                      ? ctx.metadata.lastModified.toISOString()
                      : ctx.metadata.lastModified,
                }
              : undefined,
          })),
        ]),
      );

      await LocalStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      logger.error("Failed to save contexts to storage", { error });
    }
  }

  /**
   * Store a context for a session and persist the change.
   */
  private async storeContext(sessionId: string, context: ProjectContext): Promise<ProjectContext> {
    const sessionContexts = this.contexts.get(sessionId) ?? [];
    sessionContexts.push(context);
    this.contexts.set(sessionId, sessionContexts);
    await this.saveContexts();
    return context;
  }

  /**
   * Add file context by reading content from disk and enforcing permission policies.
   */
  async addFileFromPath(sessionId: string, filePath: string): Promise<ProjectContext> {
    const sanitizedPath = await this.ensureFileAccessAllowed(filePath);

    let fileStat;
    try {
      fileStat = await stat(sanitizedPath);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to access file: ${sanitizedPath} (${reason})`);
    }

    if (!fileStat.isFile()) {
      throw new Error("Selected path is not a file");
    }

    if (fileStat.size === 0) {
      throw new Error("File is empty");
    }

    const rawContent = await readFile(sanitizedPath, "utf-8");
    const { content, isTruncated } = truncateContent(rawContent, MAX_FILE_CONTEXT_BYTES);

    const context: ProjectContext = {
      id: uuidv4(),
      sessionId,
      type: "file",
      path: sanitizedPath,
      content,
      language: detectLanguage(sanitizedPath),
      addedAt: new Date(),
      size: rawContent.length,
      metadata: {
        lastModified: fileStat.mtime,
        permissions: (fileStat.mode & 0o777).toString(8),
        isTruncated,
      },
    };

    return this.storeContext(sessionId, context);
  }

  /**
   * Add directory context by summarizing directory contents.
   */
  async addDirectoryFromPath(sessionId: string, directoryPath: string): Promise<ProjectContext> {
    const sanitizedPath = await this.ensureFileAccessAllowed(directoryPath);

    let directoryStat;
    try {
      directoryStat = await stat(sanitizedPath);
    } catch {
      throw new Error(`Unable to access directory: ${sanitizedPath}`);
    }

    if (!directoryStat.isDirectory()) {
      throw new Error("Selected path is not a directory");
    }

    const dirents = await readdir(sanitizedPath, { withFileTypes: true });
    const summary = this.formatDirectorySummary(dirents);

    const context: ProjectContext = {
      id: uuidv4(),
      sessionId,
      type: "directory",
      path: sanitizedPath,
      content: summary,
      addedAt: new Date(),
      size: summary.length,
      metadata: {
        lastModified: directoryStat.mtime,
      },
    };

    return this.storeContext(sessionId, context);
  }

  /**
   * Add file context to a session when content has already been provided.
   */
  async addFileContext(sessionId: string, filePath: string, content: string): Promise<ProjectContext> {
    validateFilePath(filePath);
    const sanitizedPath = sanitizeFilePath(filePath);

    const context: ProjectContext = {
      id: uuidv4(),
      sessionId,
      type: "file",
      path: sanitizedPath,
      content,
      language: detectLanguage(sanitizedPath),
      addedAt: new Date(),
      size: content.length,
    };

    return this.storeContext(sessionId, context);
  }

  /**
   * Add directory context to a session.
   */
  async addDirectoryContext(sessionId: string, dirPath: string, summary?: string): Promise<ProjectContext> {
    validateFilePath(dirPath);
    const sanitizedPath = sanitizeFilePath(dirPath);

    const context: ProjectContext = {
      id: uuidv4(),
      sessionId,
      type: "directory",
      path: sanitizedPath,
      content: summary,
      addedAt: new Date(),
      size: summary?.length ?? 0,
    };

    return this.storeContext(sessionId, context);
  }

  /**
   * Add code selection context to a session.
   */
  async addSelectionContext(
    sessionId: string,
    filePath: string,
    content: string,
    lineRange: { start: number; end: number },
  ): Promise<ProjectContext> {
    validateFilePath(filePath);
    const sanitizedPath = sanitizeFilePath(filePath);
    const language = detectLanguage(sanitizedPath);

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

    return this.storeContext(sessionId, context);
  }

  /**
   * Get all contexts for a session
   */
  async getSessionContext(sessionId: string): Promise<ProjectContext[]> {
    return this.contexts.get(sessionId) ?? [];
  }

  /**
   * Remove a specific context by ID
   */
  async removeContext(contextId: string): Promise<void> {
    let modified = false;

    for (const [sessionId, contexts] of this.contexts.entries()) {
      const filtered = contexts.filter((ctx) => ctx.id !== contextId);
      if (filtered.length !== contexts.length) {
        this.contexts.set(sessionId, filtered);
        modified = true;
      }
    }

    if (modified) {
      await this.saveContexts();
    }
  }

  /**
   * Clear all context for a session
   */
  async clearSessionContext(sessionId: string): Promise<void> {
    if (this.contexts.delete(sessionId)) {
      await this.saveContexts();
    }
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

  /**
   * Ensure file access is permitted based on security settings.
   */
  private async ensureFileAccessAllowed(targetPath: string): Promise<string> {
    validateFilePath(targetPath);

    const sanitizedPath = sanitizeFilePath(targetPath);
    const directory = getParentDirectory(sanitizedPath);
    let securitySettings = await this.configService.getSecuritySettings();

    if (!securitySettings.allowFileAccess) {
      const confirmed = await confirmAlert({
        title: "Enable File Access",
        message: `Allow the agent extension to read files from:\n${directory}?`,
        primaryAction: { title: "Allow", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      });

      if (!confirmed) {
        throw new Error("File access denied by user");
      }

      const updatedDirs = Array.from(new Set([...(securitySettings.allowedDirectories ?? []), directory]));
      await this.configService.updateSecuritySettings({
        allowFileAccess: true,
        allowedDirectories: updatedDirs,
      });

      securitySettings = {
        ...securitySettings,
        allowFileAccess: true,
        allowedDirectories: updatedDirs,
      };
    } else if (
      securitySettings.allowedDirectories &&
      securitySettings.allowedDirectories.length > 0 &&
      !isWithinAllowedDirectory(sanitizedPath, securitySettings.allowedDirectories)
    ) {
      const confirmed = await confirmAlert({
        title: "Allow New Directory?",
        message: `The selected path is outside of your allowed directories.\nAdd "${directory}" to the allowed list?`,
        primaryAction: { title: "Allow", style: Alert.ActionStyle.Default },
        dismissAction: { title: "Cancel", style: Alert.ActionStyle.Cancel },
      });

      if (!confirmed) {
        throw new Error("File access restricted by security settings");
      }

      const updatedDirs = Array.from(new Set([...securitySettings.allowedDirectories, directory]));
      await this.configService.updateSecuritySettings({ allowedDirectories: updatedDirs });
    }

    return sanitizedPath;
  }

  /**
   * Format directory contents for display in context metadata.
   */
  private formatDirectorySummary(entries: Dirent[]): string {
    if (entries.length === 0) {
      return "Directory is empty.";
    }

    const visible = entries
      .slice(0, DIRECTORY_SUMMARY_LIMIT)
      .map((entry) => `- ${entry.name}${entry.isDirectory() ? "/" : ""}`);

    if (entries.length > DIRECTORY_SUMMARY_LIMIT) {
      visible.push(`- …and ${entries.length - DIRECTORY_SUMMARY_LIMIT} more`);
    }

    return visible.join("\n");
  }
}
