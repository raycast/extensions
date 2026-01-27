/**
 * Integration Tests for Gemini CLI Agent
 *
 * Tests the real integration with Gemini CLI as the test agent:
 * - Agent availability and connection
 * - Basic conversation flow
 * - ACP protocol compliance
 * - Error handling with real agent
 */

import { ACPClient } from '@/services/acpClient';
import { AgentService } from '@/services/agentService';
import { SessionService } from '@/services/sessionService';
import { ConfigService } from '@/services/configService';
import { StorageService } from '@/services/storageService';
import { checkAgentAvailability, getBuiltInAgent } from '@/utils/builtInAgents';
import type { AgentConfig, SessionRequest } from '@/types/extension';

describe.skip('Gemini CLI Integration', () => {
  let acpClient: ACPClient;
  let agentService: AgentService;
  let sessionService: SessionService;
  let configService: ConfigService;
  let storageService: StorageService;
  let geminiConfig: AgentConfig;

  beforeAll(async () => {
    // Initialize services
    configService = new ConfigService();
    storageService = new StorageService();
    acpClient = new ACPClient();
    agentService = new AgentService(configService, acpClient);
    sessionService = new SessionService(storageService, acpClient);

    await storageService.initialize();

    // Get Gemini CLI configuration
    const geminiAgent = getBuiltInAgent('gemini-cli');
    if (!geminiAgent) {
      throw new Error('Gemini CLI configuration not found in built-in agents');
    }
    geminiConfig = geminiAgent;
  });

  beforeEach(() => {
    // Clear any test data before each test
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up agent service to stop health monitoring
    await agentService.cleanup();
  });

  describe('Agent Availability', () => {
    it('should detect Gemini CLI availability', async () => {
      // Act
      const availability = await checkAgentAvailability(geminiConfig);

      // Assert
      expect(availability.isAvailable).toBe(true);
      expect(availability.error).toBeUndefined();
    }, 10000); // 10 second timeout for command check

    it('should have valid Gemini CLI configuration', () => {
      // Assert
      expect(geminiConfig).toBeDefined();
      expect(geminiConfig.id).toBe('gemini-cli');
      expect(geminiConfig.name).toBe('Gemini CLI');
      expect(geminiConfig.type).toBe('subprocess');
      expect(geminiConfig.command).toBe('gemini');
      expect(geminiConfig.args).toContain('--acp');
      expect(geminiConfig.isBuiltIn).toBe(true);
    });
  });

  describe('Agent Connection', () => {
    let connectionId: string;

    afterEach(async () => {
      // Clean up connection after each test
      if (connectionId) {
        try {
          await agentService.disconnectAgent(connectionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should successfully connect to Gemini CLI', async () => {
      // Act
      const connection = await agentService.connectToAgent('gemini-cli');

      // Assert
      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.agentId).toBe('gemini-cli');
      expect(connection.status).toBe('connected');
      expect(connection.connectedAt).toBeInstanceOf(Date);

      connectionId = connection.id;
    }, 15000); // 15 second timeout for connection

    it('should maintain connection health', async () => {
      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');
      connectionId = connection.id;

      // Act
      const health = await agentService.getConnectionHealth(connection.id);

      // Assert
      expect(health.isHealthy).toBe(true);
      expect(health.lastChecked).toBeInstanceOf(Date);
      expect(health.error).toBeUndefined();
    }, 15000);

    it('should handle multiple connections gracefully', async () => {
      // Act
      const connection1 = await agentService.connectToAgent('gemini-cli');
      const connection2 = await agentService.connectToAgent('gemini-cli');

      // Assert
      expect(connection1.id).not.toBe(connection2.id);
      expect(connection1.status).toBe('connected');
      expect(connection2.status).toBe('connected');

      // Clean up
      await agentService.disconnectAgent(connection1.id);
      await agentService.disconnectAgent(connection2.id);
    }, 20000);
  });

  describe('Basic Conversation Flow', () => {
    let connectionId: string;
    let sessionId: string;

    beforeEach(async () => {
      // Establish connection for conversation tests
      const connection = await agentService.connectToAgent('gemini-cli');
      connectionId = connection.id;
    });

    afterEach(async () => {
      // Clean up after each test
      if (sessionId) {
        try {
          await sessionService.endSession(sessionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      if (connectionId) {
        try {
          await agentService.disconnectAgent(connectionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create session and send simple coding question', async () => {
      // Arrange
      const sessionRequest: SessionRequest = {
        agentConnectionId: connectionId,
        prompt: 'Write a simple TypeScript function that adds two numbers',
        context: {
          workingDirectory: process.cwd()
        }
      };

      // Act
      const session = await sessionService.createSession(sessionRequest);
      sessionId = session.sessionId;

      // Assert
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.agentConnectionId).toBe(connectionId);
      expect(session.status).toBe('active');
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].role).toBe('user');
      expect(session.messages[0].content).toContain('TypeScript function');
    }, 20000);

    it('should handle follow-up messages in existing session', async () => {
      // Arrange
      const sessionRequest: SessionRequest = {
        agentConnectionId: connectionId,
        prompt: 'Write a TypeScript function',
        context: {}
      };
      const session = await sessionService.createSession(sessionRequest);
      sessionId = session.sessionId;

      // Act
      const response = await sessionService.sendMessage(
        sessionId,
        'Now add error handling to that function'
      );

      // Assert
      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);
      expect(response.timestamp).toBeInstanceOf(Date);

      // Verify session state
      const updatedSession = await sessionService.getSession(sessionId);
      expect(updatedSession).toBeDefined();
      expect(updatedSession!.messages.length).toBeGreaterThan(2); // Initial + follow-up + responses
    }, 25000);

    it('should handle complex coding queries', async () => {
      // Arrange
      const sessionRequest: SessionRequest = {
        agentConnectionId: connectionId,
        prompt: 'Create a TypeScript class for a simple todo list with add, remove, and list methods',
        context: {
          workingDirectory: process.cwd()
        }
      };

      // Act
      const session = await sessionService.createSession(sessionRequest);
      sessionId = session.sessionId;

      // Assert
      expect(session).toBeDefined();
      expect(session.status).toBe('active');

      // Verify the response contains relevant programming concepts
      const messages = await sessionService.getSessionMessages(sessionId, 0, 10);
      expect(messages.length).toBeGreaterThan(1); // Should have at least user message + assistant response

      const assistantMessages = messages.filter(m => m.role === 'assistant');
      expect(assistantMessages.length).toBeGreaterThan(0);

      // Check that the response is substantive
      const response = assistantMessages[0];
      expect(response.content.length).toBeGreaterThan(50);
    }, 30000);
  });

  describe('Error Handling', () => {
    it('should handle invalid session gracefully', async () => {
      // Act & Assert
      await expect(sessionService.sendMessage('invalid-session-id', 'test message'))
        .rejects.toMatchObject({
          code: expect.any(String),
          message: expect.stringContaining('Session not found')
        });
    });

    it('should handle connection loss gracefully', async () => {
      // This test simulates what happens when the underlying process is killed
      // In a real scenario, the ACP client should detect the connection loss

      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');

      // Act - Force disconnect
      await agentService.disconnectAgent(connection.id);

      // Assert - Health check should fail
      const health = await agentService.getConnectionHealth(connection.id);
      expect(health.isHealthy).toBe(false);
      expect(health.error).toBeDefined();
    }, 15000);
  });

  describe('Resource Management', () => {
    it('should properly clean up resources on session end', async () => {
      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');
      const sessionRequest: SessionRequest = {
        agentConnectionId: connection.id,
        prompt: 'Simple test',
        context: {}
      };
      const session = await sessionService.createSession(sessionRequest);

      // Act
      await sessionService.endSession(session.sessionId);

      // Assert
      const endedSession = await sessionService.getSession(session.sessionId);
      expect(endedSession?.status).toBe('completed');

      // Clean up
      await agentService.disconnectAgent(connection.id);
    }, 20000);

    it('should handle concurrent sessions properly', async () => {
      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');

      const sessionRequest1: SessionRequest = {
        agentConnectionId: connection.id,
        prompt: 'First session question',
        context: {}
      };

      const sessionRequest2: SessionRequest = {
        agentConnectionId: connection.id,
        prompt: 'Second session question',
        context: {}
      };

      // Act
      const session1 = await sessionService.createSession(sessionRequest1);
      const session2 = await sessionService.createSession(sessionRequest2);

      // Assert
      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session1.status).toBe('active');
      expect(session2.status).toBe('active');

      // Clean up
      await sessionService.endSession(session1.sessionId);
      await sessionService.endSession(session2.sessionId);
      await agentService.disconnectAgent(connection.id);
    }, 25000);
  });
});