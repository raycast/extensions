/**
 * End-to-End Tests for Basic Conversation Flow
 *
 * Tests the complete user journey from opening Raycast to having a conversation:
 * - User opens extension
 * - Selects agent
 * - Sends message
 * - Receives response
 * - Conversation is saved and retrievable
 */

import { ConfigService } from '@/services/configService';
import { StorageService } from '@/services/storageService';
import { ACPClient } from '@/services/acpClient';
import { AgentService } from '@/services/agentService';
import { SessionService } from '@/services/sessionService';
import { getBuiltInAgent } from '@/utils/builtInAgents';
import type { AgentConfig, SessionRequest, ConversationSession } from '@/types/extension';

describe.skip('Basic Conversation Flow E2E', () => {
  let configService: ConfigService;
  let storageService: StorageService;
  let acpClient: ACPClient;
  let agentService: AgentService;
  let sessionService: SessionService;
  let geminiConfig: AgentConfig;

  beforeAll(async () => {
    // Initialize all services as they would be in the real extension
    configService = new ConfigService();
    storageService = new StorageService();
    acpClient = new ACPClient();
    agentService = new AgentService(configService, acpClient);
    sessionService = new SessionService(storageService, acpClient);

    await storageService.initialize();

    // Get the built-in Gemini CLI agent configuration
    const geminiAgent = getBuiltInAgent('gemini-cli');
    if (!geminiAgent) {
      throw new Error('Gemini CLI configuration not found');
    }
    geminiConfig = geminiAgent;
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await storageService.initialize();
  });

  afterAll(async () => {
    // Clean up agent service to stop health monitoring
    await agentService.cleanup();
  });

  describe('Complete User Journey', () => {
    let conversationSession: ConversationSession | null = null;
    let connectionId: string | null = null;

    afterEach(async () => {
      // Clean up after each test
      if (conversationSession) {
        try {
          await sessionService.endSession(conversationSession.sessionId);
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

    it('should complete full conversation flow from start to finish', async () => {
      // Step 1: User opens extension and sees available agents
      const availableAgents = await configService.getAgentConfigs();
      expect(availableAgents).toBeDefined();
      expect(availableAgents.length).toBeGreaterThan(0);

      const geminiAgent = availableAgents.find(agent => agent.id === 'gemini-cli');
      expect(geminiAgent).toBeDefined();
      expect(geminiAgent!.isBuiltIn).toBe(true);

      // Step 2: User selects Gemini CLI and extension connects to agent
      const connection = await agentService.connectToAgent('gemini-cli');
      connectionId = connection.id;

      expect(connection).toBeDefined();
      expect(connection.status).toBe('connected');
      expect(connection.agentId).toBe('gemini-cli');

      // Step 3: User types a coding question and starts conversation
      const userQuestion = 'Write a TypeScript function that calculates the factorial of a number';
      const sessionRequest: SessionRequest = {
        agentConnectionId: connection.id,
        prompt: userQuestion,
        context: {
          workingDirectory: process.cwd(),
          files: ['package.json'] // Share some context
        }
      };

      const session = await sessionService.createSession(sessionRequest);
      conversationSession = session;

      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.status).toBe('active');
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].role).toBe('user');
      expect(session.messages[0].content).toBe(userQuestion);

      // Step 4: User should see the response from the agent
      // The response should have been generated during session creation
      const messages = await sessionService.getSessionMessages(session.sessionId, 0, 10);
      expect(messages.length).toBeGreaterThan(1); // User message + agent response

      const agentResponse = messages.find(msg => msg.role === 'assistant');
      expect(agentResponse).toBeDefined();
      expect(agentResponse!.content).toBeDefined();
      expect(agentResponse!.content.length).toBeGreaterThan(0);

      // Step 5: User asks a follow-up question
      const followUpResponse = await sessionService.sendMessage(
        session.sessionId,
        'Now add error handling to that function'
      );

      expect(followUpResponse).toBeDefined();
      expect(followUpResponse.role).toBe('assistant');
      expect(followUpResponse.content).toBeDefined();
      expect(followUpResponse.content.length).toBeGreaterThan(0);

      // Step 6: Verify conversation is properly saved and retrievable
      const savedSession = await sessionService.getSession(session.sessionId);
      expect(savedSession).toBeDefined();
      expect(savedSession!.sessionId).toBe(session.sessionId);
      expect(savedSession!.messages.length).toBeGreaterThan(2); // Original + follow-up + responses

      // Step 7: User can view conversation history
      const allConversations = await storageService.getConversations();
      const thisConversation = allConversations.find(c => c.sessionId === session.sessionId);
      expect(thisConversation).toBeDefined();
      expect(thisConversation!.status).toBe('active');
    }, 60000); // Long timeout for full E2E flow

    it('should handle conversation with file context sharing', async () => {
      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');
      connectionId = connection.id;

      // Act - Share actual project files as context
      const sessionRequest: SessionRequest = {
        agentConnectionId: connection.id,
        prompt: 'Analyze my package.json and suggest improvements for this Raycast extension',
        context: {
          workingDirectory: process.cwd(),
          files: ['package.json', 'tsconfig.json'], // Real project files
          additionalContext: {
            projectType: 'Raycast Extension',
            purpose: 'Agent Client Protocol integration'
          }
        }
      };

      const session = await sessionService.createSession(sessionRequest);
      conversationSession = session;

      // Assert
      expect(session).toBeDefined();
      expect(session.status).toBe('active');

      const messages = await sessionService.getSessionMessages(session.sessionId, 0, 10);
      const agentResponse = messages.find(msg => msg.role === 'assistant');

      expect(agentResponse).toBeDefined();
      expect(agentResponse!.content).toBeDefined();
      // Response should be substantial since it's analyzing real files
      expect(agentResponse!.content.length).toBeGreaterThan(100);
    }, 45000);

    it('should handle multiple conversations concurrently', async () => {
      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');
      connectionId = connection.id;

      // Act - Create two different conversations
      const session1 = await sessionService.createSession({
        agentConnectionId: connection.id,
        prompt: 'Explain TypeScript interfaces',
        context: {}
      });

      const session2 = await sessionService.createSession({
        agentConnectionId: connection.id,
        prompt: 'How to use React hooks',
        context: {}
      });

      // Assert
      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session1.status).toBe('active');
      expect(session2.status).toBe('active');

      // Both conversations should be independently retrievable
      const retrievedSession1 = await sessionService.getSession(session1.sessionId);
      const retrievedSession2 = await sessionService.getSession(session2.sessionId);

      expect(retrievedSession1!.sessionId).toBe(session1.sessionId);
      expect(retrievedSession2!.sessionId).toBe(session2.sessionId);

      // Clean up both sessions
      await sessionService.endSession(session1.sessionId);
      await sessionService.endSession(session2.sessionId);
    }, 50000);

    it('should persist conversation across extension sessions', async () => {
      let savedSessionId: string;

      // First "session" - user creates conversation
      {
        const connection = await agentService.connectToAgent('gemini-cli');
        connectionId = connection.id;

        const session = await sessionService.createSession({
          agentConnectionId: connection.id,
          prompt: 'Create a simple calculator class',
          context: {}
        });

        savedSessionId = session.sessionId;
        conversationSession = session;

        // Verify conversation exists
        expect(session.status).toBe('active');
        await agentService.disconnectAgent(connection.id);
      }

      // Simulate extension restart by creating new service instances
      const newStorageService = new StorageService();
      await newStorageService.initialize();
      const newSessionService = new SessionService(newStorageService, new ACPClient());

      // Second "session" - user reopens extension and conversation should still exist
      {
        const retrievedSession = await newSessionService.getSession(savedSessionId);
        expect(retrievedSession).toBeDefined();
        expect(retrievedSession!.sessionId).toBe(savedSessionId);
        expect(retrievedSession!.messages.length).toBeGreaterThan(0);

        // User should be able to continue the conversation
        // (This would require reconnecting to the agent in a real scenario)
        conversationSession = retrievedSession;
      }
    }, 40000);
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle agent unavailable gracefully in E2E flow', async () => {
      // Simulate trying to connect to an unavailable agent
      // This tests the full error handling flow from UI perspective

      await expect(agentService.connectToAgent('nonexistent-agent'))
        .rejects.toMatchObject({
          message: expect.stringContaining('Agent configuration not found')
        });

      // User should still be able to see available agents
      const availableAgents = await configService.getAgentConfigs();
      expect(availableAgents.length).toBeGreaterThan(0);
    });

    it('should handle conversation recovery after connection loss', async () => {
      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');
      const session = await sessionService.createSession({
        agentConnectionId: connection.id,
        prompt: 'Test connection recovery',
        context: {}
      });

      // Act - Simulate connection loss
      await agentService.disconnectAgent(connection.id);

      // Assert - Session should still exist in storage
      const savedSession = await sessionService.getSession(session.sessionId);
      expect(savedSession).toBeDefined();
      expect(savedSession!.sessionId).toBe(session.sessionId);

      // User should be able to see the conversation in history
      const conversations = await storageService.getConversations();
      const foundConversation = conversations.find(c => c.sessionId === session.sessionId);
      expect(foundConversation).toBeDefined();
    }, 30000);
  });

  describe('User Experience Validation', () => {
    it('should provide responsive conversation experience', async () => {
      // Test that the conversation flow feels responsive
      const startTime = Date.now();

      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');

      // Act - Simple quick question
      const session = await sessionService.createSession({
        agentConnectionId: connection.id,
        prompt: 'What is TypeScript?',
        context: {}
      });

      const endTime = Date.now();

      // Assert - Should complete reasonably quickly for good UX
      expect(endTime - startTime).toBeLessThan(30000); // 30 second max for basic response
      expect(session.status).toBe('active');

      // Clean up
      await sessionService.endSession(session.sessionId);
      await agentService.disconnectAgent(connection.id);
    }, 35000);

    it('should maintain conversation context throughout interaction', async () => {
      // Test that context is maintained across multiple messages

      // Arrange
      const connection = await agentService.connectToAgent('gemini-cli');
      const session = await sessionService.createSession({
        agentConnectionId: connection.id,
        prompt: 'I am working on a Raycast extension. Create a simple utility function.',
        context: {
          workingDirectory: process.cwd(),
          additionalContext: {
            framework: 'Raycast',
            language: 'TypeScript'
          }
        }
      });

      // Act - Follow-up should understand the context
      const followUp = await sessionService.sendMessage(
        session.sessionId,
        'Now add unit tests for that function'
      );

      // Assert
      expect(followUp.content).toBeDefined();
      expect(followUp.content.length).toBeGreaterThan(50);

      // The response should be contextually relevant
      // (In a real test, we might check for specific keywords or patterns)

      // Clean up
      await sessionService.endSession(session.sessionId);
      await agentService.disconnectAgent(connection.id);
    }, 45000);
  });
});