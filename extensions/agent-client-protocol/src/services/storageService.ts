/**
 * Storage Service using Raycast LocalStorage
 *
 * Centralized storage management for conversations, sessions, and application state
 * using Raycast's native LocalStorage API with type-safe operations.
 */

import { LocalStorage } from "@raycast/api";
import type { ConversationSession, SessionMessage, ProjectContext } from "@/types/extension";
import { STORAGE_KEYS, getDefaultValue, STORAGE_VERSION, STORAGE_VERSION_KEY } from "@/utils/storageKeys";
import { ErrorCode, type ExtensionError } from "@/types/extension";
import { runMigrations, validateStorageIntegrity } from "@/utils/migrations";
import { createLogger } from "@/utils/logging";

const logger = createLogger("StorageService");

export class StorageService {
  private initialized = false;

  constructor() {
    // No initialization needed
  }

  /**
   * Initialize storage service and handle migrations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Run any pending migrations
      const migrationResult = await runMigrations();
      if (!migrationResult.success) {
        logger.error("Storage migration failed", {
          errors: migrationResult.errors,
          migrationsApplied: migrationResult.migrationsApplied,
        });
        throw new Error(`Migration failed: ${migrationResult.errors.join(", ")}`);
      }

      if (migrationResult.migrationsApplied.length > 0) {
        logger.info("Storage migrations applied", {
          fromVersion: migrationResult.fromVersion,
          toVersion: migrationResult.toVersion,
          migrationsApplied: migrationResult.migrationsApplied,
        });
      }

      // Validate storage integrity
      const validation = await validateStorageIntegrity();
      if (!validation.isValid) {
        logger.error("Storage integrity validation failed", {
          errors: validation.errors,
        });
      }

      if (validation.warnings.length > 0) {
        logger.warn("Storage integrity warnings", {
          warnings: validation.warnings,
        });
      }

      await this.checkStorageVersion();
      this.initialized = true;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to initialize storage: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Save conversation session
   */
  async saveConversation(session: ConversationSession): Promise<void> {
    await this.ensureInitialized();

    try {
      const conversations = await this.getConversations();
      const existingIndex = conversations.findIndex((c) => c.sessionId === session.sessionId);

      const normalized = this.normalizeConversation(session);

      if (existingIndex >= 0) {
        conversations[existingIndex] = normalized;
      } else {
        conversations.push(normalized);
      }

      // Sort by last activity (most recent first)
      conversations.sort((a, b) => this.toDate(b.lastActivity).getTime() - this.toDate(a.lastActivity).getTime());

      await LocalStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations, this.dateReplacer));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to save conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId: session.sessionId },
      );
    }
  }

  /**
   * Get conversation session by ID
   */
  async getConversation(sessionId: string): Promise<ConversationSession | null> {
    await this.ensureInitialized();

    try {
      const conversations = await this.getConversations();
      return conversations.find((c) => c.sessionId === sessionId) || null;
    } catch (error) {
      throw this.createError(
        ErrorCode.SessionNotFound,
        `Failed to get conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId },
      );
    }
  }

  /**
   * Get all conversations
   */
  async getConversations(agentId?: string): Promise<ConversationSession[]> {
    await this.ensureInitialized();

    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
      const conversationsJson = typeof stored === "string" ? stored : getDefaultValue(STORAGE_KEYS.CONVERSATIONS);

      const conversations = (JSON.parse(conversationsJson, this.dateReviver) as ConversationSession[]).map((session) =>
        this.normalizeConversation(session),
      );

      if (agentId) {
        return conversations.filter((c) => c.agentConnectionId === agentId);
      }

      return conversations;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to get conversations: ${error instanceof Error ? error.message : "Unknown error"}`,
        { agentId },
      );
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(sessionId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const conversations = await this.getConversations();
      const filteredConversations = conversations.filter((c) => c.sessionId !== sessionId);

      await LocalStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(filteredConversations, this.dateReplacer));

      // Also clean up any associated contexts
      await this.deleteProjectContextsBySession(sessionId);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to delete conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId },
      );
    }
  }

  /**
   * Archive conversation (mark as archived)
   */
  async archiveConversation(sessionId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const conversations = await this.getConversations();
      const conversation = conversations.find((c) => c.sessionId === sessionId);

      if (!conversation) {
        throw this.createError(ErrorCode.SessionNotFound, `Conversation not found: ${sessionId}`);
      }

      conversation.status = "archived";
      await this.saveConversation(conversation);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to archive conversation: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId },
      );
    }
  }

  /**
   * Add message to conversation
   * Optimized for large conversation histories with automatic archival
   */
  async addMessageToConversation(sessionId: string, message: SessionMessage): Promise<void> {
    await this.ensureInitialized();

    try {
      const conversation = await this.getConversation(sessionId);
      if (!conversation) {
        throw this.createError(ErrorCode.SessionNotFound, `Conversation not found: ${sessionId}`);
      }

      conversation.messages.push(this.normalizeMessage(message));
      conversation.lastActivity = new Date();

      // Optimized message limiting with automatic archival
      const maxMessages = 100; // TODO: Get from user preferences
      const archiveThreshold = 80; // Archive when reaching 80% of max

      if (conversation.messages.length > maxMessages) {
        // Archive older messages to separate storage
        const messagesToArchive = conversation.messages.slice(0, conversation.messages.length - archiveThreshold);
        await this.archiveMessages(sessionId, messagesToArchive);

        // Keep only recent messages in active conversation
        conversation.messages = conversation.messages.slice(-archiveThreshold);
      }

      await this.saveConversation(conversation);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to add message: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId, messageId: message.id },
      );
    }
  }

  /**
   * Archive old messages to reduce active conversation size
   * Performance optimization for large histories
   */
  private async archiveMessages(sessionId: string, messages: SessionMessage[]): Promise<void> {
    try {
      const archiveKey = `${STORAGE_KEYS.CONVERSATIONS}_archive_${sessionId}`;
      const existing = await LocalStorage.getItem(archiveKey);
      const archivedMessages = existing ? JSON.parse(String(existing), this.dateReviver) : [];

      archivedMessages.push(...messages);
      await LocalStorage.setItem(archiveKey, JSON.stringify(archivedMessages, this.dateReplacer));
    } catch (error) {
      logger.warn(`Failed to archive messages for session ${sessionId}`, { error });
      // Non-critical operation, don't throw
    }
  }

  /**
   * Get archived messages for a session
   * Performance optimization for accessing historical data
   */
  async getArchivedMessages(sessionId: string): Promise<SessionMessage[]> {
    try {
      const archiveKey = `${STORAGE_KEYS.CONVERSATIONS}_archive_${sessionId}`;
      const existing = await LocalStorage.getItem(archiveKey);
      return existing ? JSON.parse(String(existing), this.dateReviver) : [];
    } catch (error) {
      logger.warn(`Failed to get archived messages for session ${sessionId}`, { error });
      return [];
    }
  }

  /**
   * Save project context
   */
  async saveProjectContext(context: ProjectContext): Promise<void> {
    await this.ensureInitialized();

    try {
      const contexts = await this.getProjectContexts();
      const existingIndex = contexts.findIndex((c) => c.id === context.id);

      if (existingIndex >= 0) {
        contexts[existingIndex] = context;
      } else {
        contexts.push(context);
      }

      await LocalStorage.setItem(STORAGE_KEYS.PROJECT_CONTEXTS, JSON.stringify(contexts, this.dateReplacer));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to save project context: ${error instanceof Error ? error.message : "Unknown error"}`,
        { contextId: context.id, sessionId: context.sessionId },
      );
    }
  }

  /**
   * Get project contexts for a session
   */
  async getProjectContexts(sessionId?: string): Promise<ProjectContext[]> {
    await this.ensureInitialized();

    try {
      const stored = await LocalStorage.getItem(STORAGE_KEYS.PROJECT_CONTEXTS);
      const contextsJson = typeof stored === "string" ? stored : getDefaultValue(STORAGE_KEYS.PROJECT_CONTEXTS);

      const contexts = JSON.parse(contextsJson, this.dateReviver);

      // Ensure contexts is always an array
      if (!Array.isArray(contexts)) {
        logger.warn("Project contexts is not an array, resetting to empty array", {
          type: typeof contexts,
          value: contexts,
        });
        return [];
      }

      if (sessionId) {
        return contexts.filter((c) => c.sessionId === sessionId);
      }

      return contexts;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to get project contexts: ${error instanceof Error ? error.message : "Unknown error"}`,
        { sessionId },
      );
    }
  }

  /**
   * Delete project context
   */
  async deleteProjectContext(contextId: string): Promise<void> {
    await this.ensureInitialized();

    try {
      const contexts = await this.getProjectContexts();
      const filteredContexts = contexts.filter((c) => c.id !== contextId);

      await LocalStorage.setItem(STORAGE_KEYS.PROJECT_CONTEXTS, JSON.stringify(filteredContexts, this.dateReplacer));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to delete project context: ${error instanceof Error ? error.message : "Unknown error"}`,
        { contextId },
      );
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    conversations: number;
    messages: number;
    contexts: number;
    totalSize: number;
  }> {
    await this.ensureInitialized();

    try {
      const conversations = await this.getConversations();
      const contexts = await this.getProjectContexts();

      const totalMessages = conversations.reduce((sum, conv) => sum + conv.messages.length, 0);

      // Estimate storage size (rough calculation)
      const conversationsSize = JSON.stringify(conversations).length;
      const contextsSize = JSON.stringify(contexts).length;

      return {
        conversations: conversations.length,
        messages: totalMessages,
        contexts: contexts.length,
        totalSize: conversationsSize + contextsSize,
      };
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to get storage stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Clean up old data based on retention policies
   * Performance optimization: Batch operations and selective cleanup
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<{
    conversationsDeleted: number;
    messagesArchived: number;
    storageFreed: number;
  }> {
    await this.ensureInitialized();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const conversations = await this.getConversations();
      const oldConversations = conversations.filter((c) => c.status === "archived" && c.lastActivity < cutoffDate);

      let conversationsDeleted = 0;
      let messagesArchived = 0;
      let storageFreedBytes = 0;

      // Batch delete old conversations
      for (const conv of oldConversations) {
        const sizeBefore = JSON.stringify(conv).length;
        await this.deleteConversation(conv.sessionId);
        storageFreedBytes += sizeBefore;
        conversationsDeleted++;
      }

      // Archive messages in active but large conversations
      const activeConversations = conversations.filter((c) => c.status === "active");
      for (const conv of activeConversations) {
        if (conv.messages.length > 100) {
          const messagesToArchive = conv.messages.slice(0, conv.messages.length - 80);
          await this.archiveMessages(conv.sessionId, messagesToArchive);
          messagesArchived += messagesToArchive.length;

          // Update conversation with remaining messages
          conv.messages = conv.messages.slice(-80);
          await this.saveConversation(conv);
        }
      }

      return {
        conversationsDeleted,
        messagesArchived,
        storageFreed: storageFreedBytes,
      };
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to cleanup old data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Optimize storage by compressing and deduplicating data
   * Performance optimization for storage efficiency
   */
  async optimizeStorage(): Promise<{
    conversationsCompacted: number;
    duplicatesRemoved: number;
    storageReclaimed: number;
  }> {
    await this.ensureInitialized();

    try {
      const conversations = await this.getConversations();
      let conversationsCompacted = 0;
      let duplicatesRemoved = 0;
      let storageReclaimed = 0;

      for (const conv of conversations) {
        const sizeBefore = JSON.stringify(conv).length;

        // Remove duplicate messages by ID
        const uniqueMessages = new Map<string, SessionMessage>();
        for (const msg of conv.messages) {
          if (!uniqueMessages.has(msg.id)) {
            uniqueMessages.set(msg.id, msg);
          } else {
            duplicatesRemoved++;
          }
        }

        conv.messages = Array.from(uniqueMessages.values()).sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        );

        // Update metadata sequence numbers
        conv.messages.forEach((msg, index) => {
          msg.metadata.sequence = index;
        });

        const sizeAfter = JSON.stringify(conv).length;
        storageReclaimed += Math.max(0, sizeBefore - sizeAfter);

        if (sizeBefore !== sizeAfter) {
          await this.saveConversation(conv);
          conversationsCompacted++;
        }
      }

      return {
        conversationsCompacted,
        duplicatesRemoved,
        storageReclaimed,
      };
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to optimize storage: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Private: Delete project contexts by session ID
   */
  private async deleteProjectContextsBySession(sessionId: string): Promise<void> {
    try {
      const contexts = await this.getProjectContexts();
      const filteredContexts = contexts.filter((c) => c.sessionId !== sessionId);

      await LocalStorage.setItem(STORAGE_KEYS.PROJECT_CONTEXTS, JSON.stringify(filteredContexts, this.dateReplacer));
    } catch (error) {
      logger.error("Failed to delete project contexts by session", { sessionId, error });
      // Don't throw - this is a cleanup operation and shouldn't prevent conversation deletion
    }
  }

  /**
   * Private: Check and handle storage version migrations
   */
  private async checkStorageVersion(): Promise<void> {
    const storedVersion = await LocalStorage.getItem(STORAGE_VERSION_KEY);

    if (!storedVersion) {
      // First time setup
      await LocalStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
      return;
    }

    if (storedVersion !== STORAGE_VERSION) {
      // TODO: Implement migration logic for different versions
      logger.info("Storage migration needed", { from: storedVersion, to: STORAGE_VERSION });
      await LocalStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    }
  }

  /**
   * Private: Ensure storage is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private normalizeConversation(session: ConversationSession): ConversationSession {
    return {
      ...session,
      createdAt: this.toDate(session.createdAt),
      lastActivity: this.toDate(session.lastActivity),
      agentConfigId: session.agentConfigId ?? "unknown-agent",
      messages: session.messages.map((message, index) => {
        const normalized = this.normalizeMessage(message);
        if (normalized.metadata.sequence === undefined) {
          normalized.metadata.sequence = index;
        }
        return normalized;
      }),
      context: session.context
        ? {
            ...session.context,
            additionalContext: session.context.additionalContext,
          }
        : session.context,
    };
  }

  private normalizeMessage(message: SessionMessage): SessionMessage {
    return {
      ...message,
      timestamp: this.toDate(message.timestamp),
      metadata: {
        ...message.metadata,
        isStreaming: Boolean(message.metadata.isStreaming),
        sequence: message.metadata.sequence,
      },
    };
  }

  private toDate(value: Date | string | number | undefined): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  /**
   * Private: JSON replacer for Date objects
   */
  private dateReplacer(key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return { __type: "Date", value: value.toISOString() };
    }
    return value;
  }

  /**
   * Private: JSON reviver for Date objects
   */
  private dateReviver(key: string, value: unknown): unknown {
    if (
      typeof value === "object" &&
      value !== null &&
      "__type" in value &&
      (value as { __type?: unknown }).__type === "Date"
    ) {
      const dateValue = (value as { value?: unknown }).value;
      if (typeof dateValue === "string") {
        return new Date(dateValue);
      }
    }
    return value;
  }

  /**
   * Private: Create standardized error objects
   */
  private createError(code: ErrorCode, message: string, context?: Record<string, unknown>): ExtensionError {
    return {
      code,
      message,
      details: context ? JSON.stringify(context, null, 2) : "",
      timestamp: new Date(),
      context,
    };
  }
}
