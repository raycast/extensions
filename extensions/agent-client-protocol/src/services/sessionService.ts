/**
 * Session Service - Conversation Session Management
 *
 * Manages conversation sessions with agents including:
 * - Session creation and lifecycle
 * - Message handling and storage
 * - Context management
 * - Session validation and recovery
 */

import { v4 as uuidv4 } from 'uuid';
import { ACPError, ErrorCode } from '@/utils/errors';
import { createLogger, PerformanceLogger } from '@/utils/logging';
import type {
  ConversationSession,
  SessionMessage,
  SessionRequest,
  MessageRequest,
  MessageRole
} from '@/types/entities';
import type { SessionServiceInterface } from '@/types/extension';
import type { StorageService } from './storageService';
import type { ACPClient } from './acpClient';

const logger = createLogger('SessionService');

export class SessionService implements SessionServiceInterface {
  constructor(
    private storageService: StorageService,
    private acpClient: ACPClient
  ) {}

  /**
   * Create a new conversation session
   */
  async createSession(request: SessionRequest): Promise<ConversationSession> {
    const operationId = `createSession-${request.agentConnectionId}`;
    PerformanceLogger.start(operationId);

    try {
      logger.info('Creating new session', {
        agentConnectionId: request.agentConnectionId,
        promptLength: request.prompt.length
      });

      // Generate session ID
      const sessionId = uuidv4();

      // Create initial user message
      const userMessage: SessionMessage = {
        id: uuidv4(),
        role: 'user',
        content: request.prompt,
        timestamp: new Date(),
        metadata: {
          source: 'user',
          messageType: 'text',
          sequence: 0
        }
      };

      // Create session object
      const session: ConversationSession = {
        sessionId,
        agentConnectionId: request.agentConnectionId,
        status: 'active',
        createdAt: new Date(),
        lastActivity: new Date(),
        messages: [userMessage],
        metadata: {
          title: this.generateSessionTitle(request.prompt),
          tags: request.metadata?.tags || [],
          priority: request.metadata?.priority || 'normal'
        },
        context: request.context
      };

      // Send initial prompt to agent via ACP
      try {
        const acpSession = await this.acpClient.createSession(
          request.agentConnectionId,
          {
            prompt: request.prompt,
            context: request.context
          }
        );

        // Update session with any additional data from ACP
        if (acpSession.messages && acpSession.messages.length > 1) {
          // Add any additional messages returned by the agent
          const additionalMessages = acpSession.messages.slice(1);
          session.messages.push(...additionalMessages);
        }

        logger.info('Session created successfully', {
          sessionId,
          messageCount: session.messages.length
        });

      } catch (error) {
        logger.error('Failed to create ACP session', {
          sessionId,
          agentConnectionId: request.agentConnectionId,
          error
        });

        throw new ACPError(
          ErrorCode.ProtocolError,
          'Failed to create session with agent',
          error instanceof Error ? error.message : 'Unknown ACP error',
          { sessionId, agentConnectionId: request.agentConnectionId }
        );
      }

      // Save session to storage
      try {
        await this.storageService.saveConversation(session);

        logger.info('Session saved to storage', { sessionId });

        PerformanceLogger.end(operationId, {
          success: true,
          sessionId,
          messageCount: session.messages.length
        });

        return session;

      } catch (error) {
        logger.error('Failed to save session to storage', { sessionId, error });

        throw new ACPError(
          ErrorCode.SystemError,
          'Failed to save session',
          error instanceof Error ? error.message : 'Storage error',
          { sessionId }
        );
      }

    } catch (error) {
      PerformanceLogger.end(operationId, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get an existing session
   */
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    try {
      logger.debug('Retrieving session', { sessionId });

      const session = await this.storageService.getConversation(sessionId);

      if (session) {
        logger.debug('Session retrieved successfully', {
          sessionId,
          messageCount: session.messages.length,
          status: session.status
        });
      } else {
        logger.debug('Session not found', { sessionId });
      }

      return session;

    } catch (error) {
      logger.error('Failed to retrieve session', { sessionId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        'Failed to retrieve session',
        error instanceof Error ? error.message : 'Storage error',
        { sessionId }
      );
    }
  }

  /**
   * End a conversation session
   */
  async endSession(sessionId: string): Promise<void> {
    try {
      logger.info('Ending session', { sessionId });

      // Get existing session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Session not found: ${sessionId}`,
          'Cannot end a session that does not exist',
          { sessionId }
        );
      }

      // End session via ACP
      try {
        await this.acpClient.endSession(sessionId);
        logger.debug('ACP session ended', { sessionId });
      } catch (error) {
        logger.warn('Failed to end ACP session', { sessionId, error });
        // Continue with local cleanup even if ACP fails
      }

      // Update session status
      session.status = 'completed';
      session.lastActivity = new Date();

      // Save updated session
      await this.storageService.saveConversation(session);

      logger.info('Session ended successfully', { sessionId });

    } catch (error) {
      if (error instanceof ACPError) {
        throw error;
      }

      logger.error('Failed to end session', { sessionId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        'Failed to end session',
        error instanceof Error ? error.message : 'Unknown error',
        { sessionId }
      );
    }
  }

  /**
   * Send a message in an existing session
   */
  async sendMessage(
    sessionId: string,
    content: string,
    context?: MessageRequest['context']
  ): Promise<SessionMessage> {
    const operationId = `sendMessage-${sessionId}`;
    PerformanceLogger.start(operationId);

    try {
      logger.info('Sending message', {
        sessionId,
        contentLength: content.length,
        hasContext: !!context
      });

      // Get and validate session
      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Session not found: ${sessionId}`,
          'Cannot send message to a session that does not exist',
          { sessionId }
        );
      }

      if (session.status !== 'active') {
        throw new ACPError(
          ErrorCode.InvalidSession,
          `Session is not active: ${session.status}`,
          'Cannot send messages to inactive sessions',
          { sessionId, status: session.status }
        );
      }

      // Create user message
      const userMessage: SessionMessage = {
        id: uuidv4(),
        role: 'user',
        content,
        timestamp: new Date(),
        metadata: {
          source: 'user',
          messageType: 'text',
          sequence: session.messages.length
        }
      };

      // Add user message to session
      session.messages.push(userMessage);
      session.lastActivity = new Date();

      // Save user message
      await this.storageService.addMessageToConversation(sessionId, userMessage);

      // Send message to agent via ACP
      let agentResponse: SessionMessage;
      try {
        agentResponse = await this.acpClient.sendMessage(sessionId, content, context || {});

        // Update sequence number
        agentResponse.metadata.sequence = session.messages.length;

        logger.info('Agent response received', {
          sessionId,
          responseLength: agentResponse.content.length,
          processingTime: agentResponse.metadata.processingTime
        });

      } catch (error) {
        logger.error('Failed to send message to agent', { sessionId, error });

        throw new ACPError(
          ErrorCode.ProtocolError,
          'Failed to send message to agent',
          error instanceof Error ? error.message : 'ACP communication error',
          { sessionId, messageId: userMessage.id }
        );
      }

      // Add agent response to session
      session.messages.push(agentResponse);
      session.lastActivity = new Date();

      // Save agent response
      await this.storageService.addMessageToConversation(sessionId, agentResponse);

      logger.info('Message exchange completed', {
        sessionId,
        userMessageId: userMessage.id,
        agentMessageId: agentResponse.id
      });

      PerformanceLogger.end(operationId, {
        success: true,
        sessionId,
        messageCount: session.messages.length,
        responseTime: agentResponse.metadata.processingTime
      });

      return agentResponse;

    } catch (error) {
      PerformanceLogger.end(operationId, {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get messages from a session with pagination
   */
  async getSessionMessages(
    sessionId: string,
    offset: number,
    limit: number
  ): Promise<SessionMessage[]> {
    try {
      logger.debug('Getting session messages', { sessionId, offset, limit });

      const session = await this.getSession(sessionId);
      if (!session) {
        throw new ACPError(
          ErrorCode.SessionNotFound,
          `Session not found: ${sessionId}`,
          'Cannot retrieve messages from a session that does not exist',
          { sessionId }
        );
      }

      // Apply pagination
      const startIndex = Math.max(0, offset);
      const endIndex = Math.min(session.messages.length, startIndex + limit);
      const messages = session.messages.slice(startIndex, endIndex);

      logger.debug('Session messages retrieved', {
        sessionId,
        totalMessages: session.messages.length,
        returnedMessages: messages.length,
        offset,
        limit
      });

      return messages;

    } catch (error) {
      if (error instanceof ACPError) {
        throw error;
      }

      logger.error('Failed to get session messages', { sessionId, error });

      throw new ACPError(
        ErrorCode.SystemError,
        'Failed to retrieve session messages',
        error instanceof Error ? error.message : 'Unknown error',
        { sessionId }
      );
    }
  }

  /**
   * Validate that a session is active and accessible
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      logger.debug('Validating session', { sessionId });

      // Check if session exists locally
      const session = await this.getSession(sessionId);
      if (!session) {
        logger.debug('Session validation failed: not found', { sessionId });
        return false;
      }

      if (session.status !== 'active') {
        logger.debug('Session validation failed: not active', {
          sessionId,
          status: session.status
        });
        return false;
      }

      // Check if the underlying connection is still healthy
      try {
        const isConnectionHealthy = await this.acpClient.checkConnection(
          session.agentConnectionId
        );

        if (!isConnectionHealthy) {
          logger.debug('Session validation failed: connection unhealthy', {
            sessionId,
            agentConnectionId: session.agentConnectionId
          });
          return false;
        }
      } catch (error) {
        logger.debug('Session validation failed: connection check error', {
          sessionId,
          error
        });
        return false;
      }

      logger.debug('Session validation successful', { sessionId });
      return true;

    } catch (error) {
      logger.warn('Session validation error', { sessionId, error });
      return false;
    }
  }

  /**
   * Generate a human-readable title for a session based on the initial prompt
   */
  private generateSessionTitle(prompt: string): string {
    // Take first 50 characters and clean up
    let title = prompt.trim().substring(0, 50);

    // Remove newlines and extra spaces
    title = title.replace(/\s+/g, ' ');

    // Add ellipsis if truncated
    if (prompt.length > 50) {
      title += '...';
    }

    // Fallback if empty
    if (!title.trim()) {
      title = 'New Conversation';
    }

    return title;
  }
}