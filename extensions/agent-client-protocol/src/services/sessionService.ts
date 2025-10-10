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
import type {
  SessionMessage as ACPSessionMessage,
  MessageContent as ACPMessageContent,
  PromptResponse,
  SessionUpdate,
  SessionUpdateNotification,
  ToolCall,
  ToolCallUpdate,
  PlanUpdate,
  CommandsUpdate,
  ModeChange
} from '@/types/acp';
import type { AgentConfig, SessionServiceInterface } from '@/types/extension';
import type { StorageService } from './storageService';
import type { ACPClient } from './acpClient';

const logger = createLogger('SessionService');

export class SessionService implements SessionServiceInterface {
  constructor(
    private storageService: StorageService,
    private acpClient: ACPClient
  ) {
    if (typeof this.acpClient.registerSessionUpdateListener === 'function') {
      this.acpClient.registerSessionUpdateListener((update) => {
        void this.handleSessionUpdate(update);
      });
    }
  }

  private sessionObservers: Map<string, (message: SessionMessage) => void> = new Map();

  onSessionMessage(sessionId: string, handler: (message: SessionMessage) => void): void {
    this.sessionObservers.set(sessionId, handler);
  }

  offSessionMessage(sessionId: string): void {
    this.sessionObservers.delete(sessionId);
  }

  /**
   * Create a new conversation session
   */
  async createSession(request: SessionRequest): Promise<ConversationSession> {
    const operationId = `createSession-${request.agentConnectionId}`;
    PerformanceLogger.start(operationId);

    try {
      if (!request.agentConfigId) {
        throw new ACPError(
          ErrorCode.InvalidConfiguration,
          'Agent configuration ID is required to create a session',
          'No agent configuration was provided for session creation'
        );
      }

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
        agentConfigId: request.agentConfigId,
        status: 'active',
        createdAt: new Date(),
        lastActivity: new Date(),
        messages: [userMessage],
        metadata: {
          title: this.generateSessionTitle(request.prompt),
          tags: request.metadata?.tags || [],
          priority: request.metadata?.priority || 'normal'
        },
        context: {
          ...request.context,
          additionalContext: {
            ...(request.context?.additionalContext ?? {})
          }
        }
      };

      // Send initial prompt to agent via ACP
      try {
        const acpSession = await this.acpClient.createSession({
          cwd: request.context?.workingDirectory ?? process.cwd()
        });

        const promptResponse = await this.acpClient.sendPrompt(acpSession.sessionId, request.prompt);

        if (promptResponse.messages && promptResponse.messages.length > 0) {
          const agentMessages = promptResponse.messages
            .filter(message => message.type !== 'user')
            .map((message, index) =>
              this.transformAcpMessage(
                message,
                session.messages.length + index + 1
              )
            );

          if (agentMessages.length > 0) {
            session.messages.push(...agentMessages);
            session.lastActivity = new Date();
          }
        }

        session.agentSessionId = acpSession.sessionId;
        session.context = {
          ...session.context,
          additionalContext: {
            ...(session.context?.additionalContext ?? {}),
            agentSessionId: acpSession.sessionId
          }
        };

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
    agentConfig: AgentConfig,
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

      if (!session.agentConfigId) {
        session.agentConfigId = agentConfig.id;
      }

      if (session.agentConfigId !== agentConfig.id) {
        throw new ACPError(
          ErrorCode.InvalidConfiguration,
          `Session is associated with a different agent configuration (${session.agentConfigId})`,
          'Please reopen the conversation using the original agent',
          { sessionId, expectedAgent: session.agentConfigId, providedAgent: agentConfig.id }
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
      const historyBeforeNewMessage = [...session.messages];

      session.messages.push(userMessage);
      session.lastActivity = new Date();

      // Save user message
      await this.storageService.addMessageToConversation(sessionId, userMessage);

      // Send message to agent via ACP
      let promptResponse: PromptResponse;
      let agentMessages: SessionMessage[] = [];
      let agentSessionId = session.agentSessionId;
      let retriedWithNewSession = false;
      try {
        if (!agentSessionId) {
          const newAgentSession = await this.acpClient.createSession({
            cwd: session.context?.workingDirectory ?? process.cwd()
          });
          agentSessionId = newAgentSession.sessionId;
          session.agentSessionId = agentSessionId;
          session.context = {
            ...session.context,
            additionalContext: {
              ...(session.context?.additionalContext ?? {}),
              agentSessionId
            }
          };
          await this.storageService.saveConversation(session);
        }

        const promptText = this.buildPromptWithHistory(historyBeforeNewMessage, content);

        promptResponse = await this.acpClient.sendPrompt(agentSessionId, promptText);

        const responseMessages = promptResponse.messages ?? [];
        agentMessages = responseMessages
          .filter(message => message.type !== 'user')
          .map((message, index) =>
            this.transformAcpMessage(
              message,
              session.messages.length + index
            )
          );

        if (agentMessages.length === 0) {
          agentMessages = [
            {
              id: uuidv4(),
              role: 'assistant',
              content: '',
              timestamp: new Date(),
              metadata: {
                source: 'agent',
                messageType: 'text',
                sequence: session.messages.length,
                agentId: agentConfig.id,
                processingTime: promptResponse.messages?.[0]?.metadata?.processingTime
              }
            }
          ];
        }

        logger.info('Agent response received', {
          sessionId,
          responseCount: agentMessages.length,
          processingTime: agentMessages.at(-1)?.metadata.processingTime
        });

      } catch (error) {
        const details = typeof error === 'object' && error !== null && 'details' in (error as Record<string, unknown>)
          ? String((error as Record<string, unknown>).details)
          : '';

        const sessionNotFound = details.includes('Session not found');

        if (sessionNotFound && !retriedWithNewSession) {
          logger.warn('Agent session missing, creating new ACP session', {
            sessionId,
            agentConfigId: agentConfig.id
          });

          const newAgentSession = await this.acpClient.createSession({
            cwd: session.context?.workingDirectory ?? process.cwd()
          });

          agentSessionId = newAgentSession.sessionId;
          session.agentSessionId = agentSessionId;
          session.context = {
            ...session.context,
            additionalContext: {
              ...(session.context?.additionalContext ?? {}),
              agentSessionId
            }
          };

          await this.storageService.saveConversation(session);

          const retryPrompt = this.buildPromptWithHistory(historyBeforeNewMessage, content);
          promptResponse = await this.acpClient.sendPrompt(agentSessionId, retryPrompt);

          const responseMessages = promptResponse.messages ?? [];
          agentMessages = responseMessages
            .filter(message => message.type !== 'user')
            .map((message, index) =>
              this.transformAcpMessage(
                message,
                session.messages.length + index
              )
            );

          retriedWithNewSession = true;

          logger.info('Agent response received after session renewal', {
            sessionId,
            responseCount: agentMessages.length
          });

        } else {
          logger.error('Failed to send message to agent', { sessionId, error });

          throw new ACPError(
            ErrorCode.ProtocolError,
            'Failed to send message to agent',
            error instanceof Error ? error.message : 'ACP communication error',
            { sessionId, messageId: userMessage.id }
          );
        }
      }

      // Add agent response to session
      if (agentMessages.length === 0) {
        logger.info('No synchronous agent messages returned; awaiting streaming updates', { sessionId });
      } else {
        for (const agentMessage of agentMessages) {
          agentMessage.metadata.sequence = session.messages.length;
          session.messages.push(agentMessage);
          session.lastActivity = new Date();
          await this.storageService.addMessageToConversation(sessionId, agentMessage);
        }
      }

      logger.info('Message exchange completed', {
        sessionId,
        userMessageId: userMessage.id,
        agentMessageIds: agentMessages.map(msg => msg.id)
      });

      PerformanceLogger.end(operationId, {
        success: true,
        sessionId,
        messageCount: session.messages.length,
        responseTime: agentMessages.at(-1)?.metadata.processingTime
      });

      return agentMessages.at(-1)!;

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

  private transformAcpMessage(message: ACPSessionMessage, sequence: number): SessionMessage {
    const { text, messageType } = this.flattenAcpContent(message.content);

    return {
      id: message.id,
      role: this.mapAcpRole(message.type),
      content: text,
      timestamp: new Date(message.timestamp),
      metadata: {
        source: this.mapAcpSource(message.type),
        messageType,
        sequence,
        tokenCount: message.metadata?.tokensUsed,
        processingTime: message.metadata?.processingTime,
        isStreaming: false
      }
    };
  }

  private flattenAcpContent(contents: ACPMessageContent[]): { text: string; messageType: SessionMessage['metadata']['messageType'] } {
    let messageType: SessionMessage['metadata']['messageType'] = 'text';
    const parts: string[] = [];

    for (const content of contents) {
      switch (content.type) {
        case 'text':
          parts.push(content.text);
          break;
        case 'code':
          parts.push(content.code);
          messageType = messageType === 'text' ? 'code' : messageType;
          break;
        case 'file':
          parts.push(`${content.filename ?? 'File'}: ${content.content ?? ''}`);
          messageType = messageType === 'text' ? 'file' : messageType;
          break;
        case 'error':
          parts.push(`Error: ${content.error}`);
          break;
        default:
          break;
      }
    }

    return {
      text: parts.join('\n\n').trim(),
      messageType
    };
  }

  private mapAcpRole(role: ACPSessionMessage['type']): MessageRole {
    switch (role) {
      case 'user':
        return 'user';
      case 'agent':
        return 'assistant';
      case 'system':
        return 'system';
      default:
        return 'system';
    }
  }

  private mapAcpSource(role: ACPSessionMessage['type']): SessionMessage['metadata']['source'] {
    switch (role) {
      case 'user':
        return 'user';
      case 'agent':
        return 'agent';
      default:
        return 'system';
    }
  }

  private buildPromptWithHistory(
    historyMessages: SessionMessage[],
    content: string
  ): string {
    const historyLines = historyMessages
      .map((message) => {
        const sender =
          message.role === 'user' ? 'User' :
          message.role === 'assistant' ? 'Assistant' :
          'System';
        return `${sender}: ${message.content}`;
      })
      .join('\n');

    const newLine = `User: ${content}`;

    if (!historyLines) {
      return newLine;
    }

    return `Conversation history:\n${historyLines}\n\n${newLine}`;
  }

  private async handleSessionUpdate(update: SessionUpdateNotification): Promise<void> {
    const sessionId = update.sessionId;
    const session = await this.storageService.getConversation(sessionId);
    if (!session) {
      return;
    }

    const message = this.transformSessionUpdate(update, session.messages.length);
    if (!message) {
      return;
    }

    const lastMessage = session.messages[session.messages.length - 1];
    let notificationTarget: SessionMessage = message;

    if (
      message.metadata.isStreaming &&
      lastMessage &&
      lastMessage.metadata?.isStreaming &&
      lastMessage.role === message.role
    ) {
      lastMessage.content = `${lastMessage.content ?? ""}${message.content ?? ""}`;
      lastMessage.timestamp = message.timestamp;
      notificationTarget = lastMessage;
    } else {
      session.messages.push(message);
    }

    session.lastActivity = new Date();
    await this.storageService.saveConversation(session);

    const observer = this.sessionObservers.get(sessionId);
    if (observer) {
      observer(notificationTarget);
    }
  }

  private transformSessionUpdate(update: SessionUpdateNotification, sequence: number): SessionMessage | null {
    const { update: payload } = update;
    if (!payload) {
      return null;
    }

    switch (payload.sessionUpdate) {
      case 'agent_message_chunk':
      case 'user_message_chunk':
      case 'agent_thought_chunk': {
        const role = payload.sessionUpdate === 'user_message_chunk' ? 'user' :
          payload.sessionUpdate === 'agent_message_chunk' ? 'assistant' : 'system';

        const { text, messageType } = this.flattenAcpContent([payload.content]);

        return {
          id: `${payload.sessionUpdate}-${Date.now()}`,
          role,
          content: text,
          timestamp: new Date(),
          metadata: {
            source: role === 'user' ? 'user' : role === 'assistant' ? 'agent' : 'system',
            messageType,
            sequence,
            isStreaming: true
          }
        };
      }
      case 'tool_call':
      case 'tool_call_update': {
        const toolUpdate = payload as ToolCall | ToolCallUpdate;
        return {
          id: toolUpdate.toolCallId,
          role: 'tool',
          content: `Tool ${toolUpdate.toolCallId} ${toolUpdate.sessionUpdate === 'tool_call' ? toolUpdate.status : toolUpdate.status}`,
          timestamp: new Date(),
          metadata: {
            source: 'agent',
            messageType: 'tool_call',
            sequence
          },
          toolCall: {
            name: toolUpdate.sessionUpdate === 'tool_call' ? (toolUpdate.title ?? toolUpdate.toolCallId) : toolUpdate.toolCallId,
            arguments: toolUpdate.sessionUpdate === 'tool_call' ? (toolUpdate.input ?? {}) : {},
            callId: toolUpdate.toolCallId
          }
        };
      }
      case 'plan': {
        const planUpdate = payload as PlanUpdate;
        const planText = [
          `Plan: ${planUpdate.plan.title}`,
          planUpdate.plan.description ?? '',
          ...planUpdate.plan.steps.map(step => `- [${step.status === 'completed' ? 'x' : ' '}] ${step.title}`)
        ].join('\n');
        return {
          id: `plan-${Date.now()}`,
          role: 'system',
          content: planText,
          timestamp: new Date(),
          metadata: {
            source: 'agent',
            messageType: 'text',
            sequence
          }
        };
      }
      case 'commands': {
        const commandsUpdate = payload as CommandsUpdate;
        const commandText = commandsUpdate.commands.map(command => `- ${command.name}: ${command.description}`).join('\n');
        return {
          id: `commands-${Date.now()}`,
          role: 'system',
          content: `Available Commands:\n${commandText}`,
          timestamp: new Date(),
          metadata: {
            source: 'agent',
            messageType: 'text',
            sequence
          }
        };
      }
      case 'mode_change': {
        const modeChange = payload as ModeChange;
        return {
          id: `mode-${Date.now()}`,
          role: 'system',
          content: `Agent switched to mode: ${modeChange.mode}`,
          timestamp: new Date(),
          metadata: {
            source: 'agent',
            messageType: 'text',
            sequence
          }
        };
      }
      default:
        return null;
    }
  }
}
