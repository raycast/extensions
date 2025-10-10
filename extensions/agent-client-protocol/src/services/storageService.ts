/**
 * Storage Service using Raycast LocalStorage
 *
 * Centralized storage management for conversations, sessions, and application state
 * using Raycast's native LocalStorage API with type-safe operations.
 */

import { LocalStorage } from "@raycast/api";
import type {
  ConversationSession,
  SessionMessage,
  ProjectContext
} from "@/types/extension";
import { STORAGE_KEYS, getDefaultValue, STORAGE_VERSION, STORAGE_VERSION_KEY } from "@/utils/storageKeys";
import { ErrorCode, type ExtensionError } from "@/types/extension";

export class StorageService {
  private initialized = false;

  /**
   * Initialize storage service and handle migrations
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.checkStorageVersion();
      this.initialized = true;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to initialize storage: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      const existingIndex = conversations.findIndex(c => c.sessionId === session.sessionId);

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
        `Failed to save conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId: session.sessionId }
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
      return conversations.find(c => c.sessionId === sessionId) || null;
    } catch (error) {
      throw this.createError(
        ErrorCode.SessionNotFound,
        `Failed to get conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId }
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
      const conversationsJson = stored || getDefaultValue(STORAGE_KEYS.CONVERSATIONS);

      const conversations = (JSON.parse(conversationsJson, this.dateReviver) as ConversationSession[])
        .map(session => this.normalizeConversation(session));

      if (agentId) {
        return conversations.filter(c => c.agentConnectionId === agentId);
      }

      return conversations;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to get conversations: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { agentId }
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
      const filteredConversations = conversations.filter(c => c.sessionId !== sessionId);

      await LocalStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(filteredConversations, this.dateReplacer));

      // Also clean up any associated contexts
      await this.deleteProjectContextsBySession(sessionId);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to delete conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId }
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
      const conversation = conversations.find(c => c.sessionId === sessionId);

      if (!conversation) {
        throw this.createError(ErrorCode.SessionNotFound, `Conversation not found: ${sessionId}`);
      }

      conversation.status = 'archived';
      await this.saveConversation(conversation);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to archive conversation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId }
      );
    }
  }

  /**
   * Add message to conversation
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

      // Limit message history based on preferences
      const maxMessages = 100; // TODO: Get from user preferences
      if (conversation.messages.length > maxMessages) {
        conversation.messages = conversation.messages.slice(-maxMessages);
      }

      await this.saveConversation(conversation);
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to add message: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId, messageId: message.id }
      );
    }
  }

  /**
   * Save project context
   */
  async saveProjectContext(context: ProjectContext): Promise<void> {
    await this.ensureInitialized();

    try {
      const contexts = await this.getProjectContexts();
      const existingIndex = contexts.findIndex(c => c.id === context.id);

      if (existingIndex >= 0) {
        contexts[existingIndex] = context;
      } else {
        contexts.push(context);
      }

      await LocalStorage.setItem(STORAGE_KEYS.PROJECT_CONTEXTS, JSON.stringify(contexts, this.dateReplacer));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to save project context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { contextId: context.id, sessionId: context.sessionId }
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
      const contextsJson = stored || getDefaultValue(STORAGE_KEYS.PROJECT_CONTEXTS);

      const contexts = JSON.parse(contextsJson, this.dateReviver) as ProjectContext[];

      if (sessionId) {
        return contexts.filter(c => c.sessionId === sessionId);
      }

      return contexts;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to get project contexts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { sessionId }
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
      const filteredContexts = contexts.filter(c => c.id !== contextId);

      await LocalStorage.setItem(STORAGE_KEYS.PROJECT_CONTEXTS, JSON.stringify(filteredContexts, this.dateReplacer));
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to delete project context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { contextId }
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
        totalSize: conversationsSize + contextsSize
      };
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to get storage stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Clean up old data based on retention policies
   */
  async cleanupOldData(daysToKeep: number = 30): Promise<number> {
    await this.ensureInitialized();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const conversations = await this.getConversations();
      const oldConversations = conversations.filter(c =>
        c.status === 'archived' && c.lastActivity < cutoffDate
      );

      let cleanedCount = 0;
      for (const conv of oldConversations) {
        await this.deleteConversation(conv.sessionId);
        cleanedCount++;
      }

      return cleanedCount;
    } catch (error) {
      throw this.createError(
        ErrorCode.SystemError,
        `Failed to cleanup old data: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Private: Delete project contexts by session ID
   */
  private async deleteProjectContextsBySession(sessionId: string): Promise<void> {
    const contexts = await this.getProjectContexts();
    const filteredContexts = contexts.filter(c => c.sessionId !== sessionId);

    await LocalStorage.setItem(STORAGE_KEYS.PROJECT_CONTEXTS, JSON.stringify(filteredContexts, this.dateReplacer));
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
      console.log(`Storage migration needed: ${storedVersion} -> ${STORAGE_VERSION}`);
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
      agentConfigId: session.agentConfigId ?? 'unknown-agent',
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
            additionalContext: session.context.additionalContext
          }
        : session.context
    };
  }

  private normalizeMessage(message: SessionMessage): SessionMessage {
    return {
      ...message,
      timestamp: this.toDate(message.timestamp),
      metadata: {
        ...message.metadata,
        isStreaming: Boolean(message.metadata.isStreaming),
        sequence: message.metadata.sequence
      }
    };
  }

  private toDate(value: Date | string | number | undefined): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
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
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  /**
   * Private: JSON reviver for Date objects
   */
  private dateReviver(key: string, value: unknown): unknown {
    if (
      typeof value === 'object' &&
      value !== null &&
      (value as any).__type === 'Date'
    ) {
      return new Date((value as any).value);
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
      details: context ? JSON.stringify(context, null, 2) : '',
      timestamp: new Date(),
      context
    };
  }
}
