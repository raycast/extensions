/**
 * HistoryService - Conversation history aggregation and export
 *
 * Provides condensed summaries, search utilities, and export helpers
 * on top of the StorageService conversation data.
 */

import type { ConversationSession, SessionMessage } from "@/types/entities";
import type { ProjectContext } from "@/types/entities";
import { StorageService } from "./storageService";

export interface ConversationSummary {
  sessionId: string;
  agentConfigId: string;
  status: ConversationSession["status"];
  lastActivity: Date;
  messageCount: number;
  preview: string;
  title?: string;
  tags?: string[];
}

export interface ConversationSummaryOptions {
  agentIds?: string[];
  statuses?: ConversationSession["status"][];
  limit?: number;
}

export interface SearchOptions extends ConversationSummaryOptions {
  includeAssistant?: boolean;
}

export interface ExportOptions {
  sessionIds?: string[];
  includeContexts?: boolean;
}

interface ExportPayload {
  exportedAt: string;
  metadata: {
    sessionCount: number;
    totalMessages: number;
    includeContexts: boolean;
  };
  sessions: Array<{
    sessionId: string;
    agentConfigId: string;
    status: ConversationSession["status"];
    createdAt: string;
    lastActivity: string;
    metadata?: ConversationSession["metadata"];
    context?: ConversationSession["context"];
    messages: Array<{
      id: string;
      role: SessionMessage["role"];
      content: string;
      timestamp: string;
      metadata: SessionMessage["metadata"];
    }>;
  }>;
  contexts?: Record<string, ProjectContext[]>;
}

export class HistoryService {
  constructor(private readonly storageService: StorageService = new StorageService()) {}

  async getConversationSummaries(options: ConversationSummaryOptions = {}): Promise<ConversationSummary[]> {
    const sessions = await this.storageService.getConversations();
    const filtered = this.applyFilters(sessions, options);

    const summaries = filtered
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .map((session) => this.toSummary(session));

    if (options.limit && options.limit > 0) {
      return summaries.slice(0, options.limit);
    }

    return summaries;
  }

  async searchConversations(query: string, options: SearchOptions = {}): Promise<ConversationSummary[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const sessions = await this.storageService.getConversations();
    const filtered = this.applyFilters(sessions, options);

    if (!normalizedQuery) {
      return filtered.map((session) => this.toSummary(session));
    }

    const matches = filtered.filter((session) => this.matchesQuery(session, normalizedQuery, options.includeAssistant));
    return matches
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .map((session) => this.toSummary(session));
  }

  async exportConversations(options: ExportOptions = {}): Promise<string> {
    const includeContexts = options.includeContexts ?? true;
    const sessions = await this.storageService.getConversations();
    const selected = options.sessionIds?.length
      ? sessions.filter((session) => options.sessionIds!.includes(session.sessionId))
      : sessions;

    const payload: ExportPayload = {
      exportedAt: new Date().toISOString(),
      metadata: {
        sessionCount: selected.length,
        totalMessages: selected.reduce((sum, session) => sum + session.messages.length, 0),
        includeContexts,
      },
      sessions: selected.map((session) => ({
        sessionId: session.sessionId,
        agentConfigId: session.agentConfigId,
        status: session.status,
        createdAt: session.createdAt.toISOString(),
        lastActivity: session.lastActivity.toISOString(),
        metadata: session.metadata,
        context: session.context,
        messages: session.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp.toISOString(),
          metadata: message.metadata,
        })),
      })),
    };

    if (includeContexts && typeof this.storageService.getProjectContexts === "function") {
      const allContexts = await this.storageService.getProjectContexts();
      const grouped: Record<string, ProjectContext[]> = {};

      for (const context of allContexts) {
        if (!options.sessionIds || options.sessionIds.includes(context.sessionId)) {
          if (!grouped[context.sessionId]) {
            grouped[context.sessionId] = [];
          }
          grouped[context.sessionId].push(context);
        }
      }

      payload.contexts = grouped;
    }

    return JSON.stringify(payload, null, 2);
  }

  private applyFilters<T extends ConversationSession>(sessions: T[], options: ConversationSummaryOptions): T[] {
    return sessions.filter((session) => {
      const matchesAgent = options.agentIds?.length ? options.agentIds.includes(session.agentConfigId) : true;
      const matchesStatus = options.statuses?.length ? options.statuses.includes(session.status) : true;
      return matchesAgent && matchesStatus;
    });
  }

  private toSummary(session: ConversationSession): ConversationSummary {
    const previewSource =
      session.messages.find((msg) => msg.role === "user" && msg.content.trim().length > 0) ??
      session.messages.find((msg) => msg.content.trim().length > 0);

    return {
      sessionId: session.sessionId,
      agentConfigId: session.agentConfigId,
      status: session.status,
      lastActivity: session.lastActivity,
      messageCount: session.messages.length,
      preview: this.truncate(previewSource?.content ?? "", 160),
      title: session.metadata?.title,
      tags: session.metadata?.tags,
    };
  }

  private matchesQuery(session: ConversationSession, query: string, includeAssistant = true): boolean {
    const haystacks: string[] = [];

    if (session.metadata?.title) {
      haystacks.push(session.metadata.title.toLowerCase());
    }

    if (session.metadata?.tags) {
      haystacks.push(...session.metadata.tags.map((tag) => tag.toLowerCase()));
    }

    for (const message of session.messages) {
      if (!includeAssistant && message.role !== "user") {
        continue;
      }
      if (message.content) {
        haystacks.push(message.content.toLowerCase());
      }
    }

    return haystacks.some((text) => text.includes(query));
  }

  private truncate(text: string, length: number): string {
    if (text.length <= length) {
      return text;
    }
    return `${text.slice(0, length - 1)}…`;
  }
}
