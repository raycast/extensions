/**
 * Unit Tests for SessionService
 *
 * Tests the core session and message management functionality including:
 * - Session creation and lifecycle
 * - Message handling and storage
 * - Conversation state management
 * - Error handling and recovery
 */

import { SessionService } from '@/services/sessionService';
import { StorageService } from '@/services/storageService';
import { ACPClient } from '@/services/acpClient';
import { ErrorCode } from '@/types/extension';
import type { ConversationSession, SessionMessage, SessionRequest } from '@/types/extension';

// Mock dependencies
jest.mock('@/services/storageService');
jest.mock('@/services/acpClient');

const MockedStorageService = StorageService as jest.MockedClass<typeof StorageService>;
const MockedACPClient = ACPClient as jest.MockedClass<typeof ACPClient>;

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockACPClient: jest.Mocked<ACPClient>;

  const mockSessionRequest: SessionRequest = {
    agentConnectionId: 'conn-123',
    prompt: 'Help me write a function in TypeScript',
    context: {
      files: ['/path/to/file.ts'],
      workingDirectory: '/project/root'
    }
  };

  const mockUserMessage: SessionMessage = {
    id: 'msg-user-1',
    role: 'user',
    content: 'Help me write a function in TypeScript',
    timestamp: new Date(),
    metadata: {
      source: 'user',
      messageType: 'text'
    }
  };

  const mockAssistantMessage: SessionMessage = {
    id: 'msg-assistant-1',
    role: 'assistant',
    content: 'Here is a TypeScript function example...',
    timestamp: new Date(),
    metadata: {
      source: 'agent',
      messageType: 'text',
      agentId: 'test-agent'
    }
  };

  const mockSession: ConversationSession = {
    sessionId: 'session-123',
    agentConnectionId: 'conn-123',
    status: 'active',
    createdAt: new Date(),
    lastActivity: new Date(),
    messages: [mockUserMessage],
    metadata: {
      title: 'TypeScript Help',
      tags: ['typescript', 'coding']
    }
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockStorageService = new MockedStorageService() as jest.Mocked<StorageService>;
    mockACPClient = new MockedACPClient() as jest.Mocked<ACPClient>;

    // Create service instance
    sessionService = new SessionService(mockStorageService, mockACPClient);
  });

  describe('createSession', () => {
    it('should successfully create a new session', async () => {
      // Arrange
      mockACPClient.createSession.mockResolvedValue(mockSession);
      mockStorageService.saveConversation.mockResolvedValue(undefined);

      // Act
      const result = await sessionService.createSession(mockSessionRequest);

      // Assert
      expect(result).toBeDefined();
      expect(result.sessionId).toBe('session-123');
      expect(result.status).toBe('active');
      expect(result.messages).toHaveLength(1);
      expect(mockACPClient.createSession).toHaveBeenCalledWith(
        'conn-123',
        expect.objectContaining({
          prompt: 'Help me write a function in TypeScript'
        })
      );
      expect(mockStorageService.saveConversation).toHaveBeenCalledWith(result);
    });

    it('should handle ACP client session creation failure', async () => {
      // Arrange
      mockACPClient.createSession.mockRejectedValue(new Error('ACP session creation failed'));

      // Act & Assert
      await expect(sessionService.createSession(mockSessionRequest)).rejects.toMatchObject({
        code: ErrorCode.ProtocolError,
        message: expect.stringContaining('Failed to create session')
      });
    });

    it('should handle storage save failure gracefully', async () => {
      // Arrange
      mockACPClient.createSession.mockResolvedValue(mockSession);
      mockStorageService.saveConversation.mockRejectedValue(new Error('Storage failed'));

      // Act & Assert
      await expect(sessionService.createSession(mockSessionRequest)).rejects.toMatchObject({
        code: ErrorCode.SystemError,
        message: expect.stringContaining('Failed to save session')
      });
    });
  });

  describe('sendMessage', () => {
    it('should successfully send message and receive response', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(mockSession);
      mockACPClient.sendMessage.mockResolvedValue(mockAssistantMessage);
      mockStorageService.addMessageToConversation.mockResolvedValue(undefined);

      // Act
      const result = await sessionService.sendMessage('session-123', 'What about error handling?');

      // Assert
      expect(result).toBeDefined();
      expect(result.role).toBe('assistant');
      expect(result.content).toBe('Here is a TypeScript function example...');
      expect(mockStorageService.addMessageToConversation).toHaveBeenCalledTimes(2); // user message + assistant response
    });

    it('should throw error when session not found', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(null);

      // Act & Assert
      await expect(sessionService.sendMessage('nonexistent-session', 'test message')).rejects.toMatchObject({
        code: ErrorCode.SessionNotFound,
        message: expect.stringContaining('Session not found')
      });
    });

    it('should handle inactive session gracefully', async () => {
      // Arrange
      const inactiveSession = { ...mockSession, status: 'completed' as const };
      mockStorageService.getConversation.mockResolvedValue(inactiveSession);

      // Act & Assert
      await expect(sessionService.sendMessage('session-123', 'test message')).rejects.toMatchObject({
        code: ErrorCode.InvalidSession,
        message: expect.stringContaining('Session is not active')
      });
    });

    it('should handle ACP message send failure', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(mockSession);
      mockACPClient.sendMessage.mockRejectedValue(new Error('Message send failed'));

      // Act & Assert
      await expect(sessionService.sendMessage('session-123', 'test message')).rejects.toMatchObject({
        code: ErrorCode.ProtocolError,
        message: expect.stringContaining('Failed to send message')
      });
    });
  });

  describe('getSession', () => {
    it('should successfully retrieve existing session', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(mockSession);

      // Act
      const result = await sessionService.getSession('session-123');

      // Assert
      expect(result).toEqual(mockSession);
      expect(mockStorageService.getConversation).toHaveBeenCalledWith('session-123');
    });

    it('should return null when session does not exist', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(null);

      // Act
      const result = await sessionService.getSession('nonexistent-session');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle storage retrieval errors', async () => {
      // Arrange
      mockStorageService.getConversation.mockRejectedValue(new Error('Storage error'));

      // Act & Assert
      await expect(sessionService.getSession('session-123')).rejects.toMatchObject({
        code: ErrorCode.SystemError,
        message: expect.stringContaining('Failed to retrieve session')
      });
    });
  });

  describe('endSession', () => {
    it('should successfully end an active session', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(mockSession);
      mockACPClient.endSession.mockResolvedValue(undefined);
      mockStorageService.saveConversation.mockResolvedValue(undefined);

      // Act
      await sessionService.endSession('session-123');

      // Assert
      expect(mockACPClient.endSession).toHaveBeenCalledWith('session-123');
      expect(mockStorageService.saveConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'completed',
          sessionId: 'session-123'
        })
      );
    });

    it('should handle ending non-existent session', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(null);

      // Act & Assert
      await expect(sessionService.endSession('nonexistent-session')).rejects.toMatchObject({
        code: ErrorCode.SessionNotFound,
        message: expect.stringContaining('Session not found')
      });
    });
  });

  describe('getSessionMessages', () => {
    it('should return paginated messages from session', async () => {
      // Arrange
      const sessionWithMessages = {
        ...mockSession,
        messages: [mockUserMessage, mockAssistantMessage]
      };
      mockStorageService.getConversation.mockResolvedValue(sessionWithMessages);

      // Act
      const result = await sessionService.getSessionMessages('session-123', 0, 10);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(mockUserMessage);
      expect(result[1]).toEqual(mockAssistantMessage);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const manyMessages = Array.from({ length: 15 }, (_, i) => ({
        ...mockUserMessage,
        id: `msg-${i}`,
        content: `Message ${i}`
      }));
      const sessionWithManyMessages = { ...mockSession, messages: manyMessages };
      mockStorageService.getConversation.mockResolvedValue(sessionWithManyMessages);

      // Act
      const result = await sessionService.getSessionMessages('session-123', 5, 5);

      // Assert
      expect(result).toHaveLength(5);
      expect(result[0].content).toBe('Message 5');
      expect(result[4].content).toBe('Message 9');
    });
  });

  describe('validateSession', () => {
    it('should validate active session successfully', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(mockSession);
      mockACPClient.checkConnection.mockResolvedValue(true);

      // Act
      const isValid = await sessionService.validateSession('session-123');

      // Assert
      expect(isValid).toBe(true);
    });

    it('should return false for invalid session', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(null);

      // Act
      const isValid = await sessionService.validateSession('nonexistent-session');

      // Assert
      expect(isValid).toBe(false);
    });

    it('should return false when connection is down', async () => {
      // Arrange
      mockStorageService.getConversation.mockResolvedValue(mockSession);
      mockACPClient.checkConnection.mockResolvedValue(false);

      // Act
      const isValid = await sessionService.validateSession('session-123');

      // Assert
      expect(isValid).toBe(false);
    });
  });
});