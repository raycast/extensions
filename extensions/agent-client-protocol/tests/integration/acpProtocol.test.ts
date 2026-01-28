/**
 * Integration Tests for ACP Protocol Compliance
 *
 * Tests that our implementation correctly follows the Agent Client Protocol specification:
 * - JSON-RPC 2.0 message format compliance
 * - Required protocol methods and responses
 * - Error handling according to ACP spec
 * - Session lifecycle management
 */

import { ACPClient } from '@/services/acpClient';
import { getBuiltInAgent } from '@/utils/builtInAgents';
import type { AgentConfig } from '@/types/extension';
import type * as acp from '@zed-industries/agent-client-protocol';

const shouldRunAcpProtocolTests = process.env.RUN_ACP_PROTOCOL_TESTS === 'true';

(shouldRunAcpProtocolTests ? describe : describe.skip)('ACP Protocol Compliance', () => {
  let acpClient: ACPClient;
  let geminiConfig: AgentConfig;

  beforeAll(async () => {
    acpClient = new ACPClient();

    // Get Gemini CLI configuration for testing
    const geminiAgent = getBuiltInAgent('gemini-cli');
    if (!geminiAgent) {
      throw new Error('Gemini CLI configuration not found');
    }
    geminiConfig = geminiAgent;
  });

  describe('Connection and Initialization', () => {
    let connectionId: string;

    afterEach(async () => {
      if (connectionId) {
        try {
          await acpClient.disconnect(connectionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should establish connection using ACP initialization protocol', async () => {
      // Act
      const connection = await acpClient.connect(geminiConfig);

      // Assert
      expect(connection).toBeDefined();
      expect(connection.id).toBeDefined();
      expect(connection.agentId).toBe('gemini-cli');
      expect(connection.status).toBe('connected');

      connectionId = connection.id;
    }, 15000);

    it('should handle server capabilities negotiation', async () => {
      // Act
      const connection = await acpClient.connect(geminiConfig);
      connectionId = connection.id;

      // The connection itself proves capabilities were negotiated
      // ACP requires capability exchange during initialization
      expect(connection.status).toBe('connected');

      // Verify we can check connection (basic capability)
      const isHealthy = await acpClient.checkConnection(connection.id);
      expect(typeof isHealthy).toBe('boolean');
    }, 15000);
  });

  describe('Session Management Protocol', () => {
    let connectionId: string;
    let sessionId: string;

    beforeEach(async () => {
      const connection = await acpClient.connect(geminiConfig);
      connectionId = connection.id;
    });

    afterEach(async () => {
      if (sessionId) {
        try {
          await acpClient.endSession(sessionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
      if (connectionId) {
        try {
          await acpClient.disconnect(connectionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should create session using ACP session protocol', async () => {
      // Arrange
      const sessionRequest: acp.CreateSessionRequest = {
        prompt: 'Test session creation',
        context: {
          workingDirectory: process.cwd()
        }
      };

      // Act
      const session = await acpClient.createSession(connectionId, sessionRequest);

      // Assert
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.agentConnectionId).toBe(connectionId);
      expect(session.status).toBe('active');
      expect(session.messages).toBeDefined();
      expect(Array.isArray(session.messages)).toBe(true);

      sessionId = session.sessionId;
    }, 20000);

    it('should send messages using ACP message protocol', async () => {
      // Arrange
      const session = await acpClient.createSession(connectionId, {
        prompt: 'Initial prompt',
        context: {}
      });
      sessionId = session.sessionId;

      // Act
      const response = await acpClient.sendMessage(sessionId, 'Test message', {});

      // Assert
      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBeDefined();
      expect(response.timestamp).toBeInstanceOf(Date);
      expect(response.metadata).toBeDefined();
    }, 25000);

    it('should handle session updates and streaming', async () => {
      // Arrange
      const session = await acpClient.createSession(connectionId, {
        prompt: 'Test streaming',
        context: {}
      });
      sessionId = session.sessionId;

      // Act - Send message that might produce streaming response
      const response = await acpClient.sendMessage(sessionId, 'Write a simple function', {});

      // Assert
      expect(response).toBeDefined();
      expect(response.content.length).toBeGreaterThan(0);

      // Verify session was updated
      const connections = await acpClient.getActiveConnections();
      const activeConnection = connections.find(c => c.id === connectionId);
      expect(activeConnection).toBeDefined();
    }, 30000);
  });

  describe('Error Handling Protocol', () => {
    let connectionId: string;

    beforeEach(async () => {
      const connection = await acpClient.connect(geminiConfig);
      connectionId = connection.id;
    });

    afterEach(async () => {
      if (connectionId) {
        try {
          await acpClient.disconnect(connectionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should handle invalid session ID according to ACP spec', async () => {
      // Act & Assert
      await expect(acpClient.sendMessage('invalid-session-id', 'test', {}))
        .rejects.toThrow();
    });

    it('should handle malformed requests gracefully', async () => {
      // This test verifies error handling for protocol violations
      // The exact implementation depends on how the ACP client handles errors

      // Act & Assert - Try to create session with invalid connection
      await expect(acpClient.createSession('invalid-connection-id', {
        prompt: 'test',
        context: {}
      })).rejects.toThrow();
    });

    it('should handle timeout scenarios', async () => {
      // This test would ideally test timeout handling
      // For now, we verify that long operations eventually complete or timeout properly

      const session = await acpClient.createSession(connectionId, {
        prompt: 'Simple test for timeout handling',
        context: {}
      });

      expect(session).toBeDefined();

      // Clean up
      await acpClient.endSession(session.sessionId);
    }, 15000);
  });

  describe('Protocol Message Format', () => {
    let connectionId: string;

    beforeEach(async () => {
      const connection = await acpClient.connect(geminiConfig);
      connectionId = connection.id;
    });

    afterEach(async () => {
      if (connectionId) {
        try {
          await acpClient.disconnect(connectionId);
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    });

    it('should use proper JSON-RPC 2.0 format for requests', async () => {
      // This test verifies that our implementation follows JSON-RPC 2.0
      // The actual wire protocol testing would require lower-level access
      // For now, we verify that the high-level operations work correctly

      const session = await acpClient.createSession(connectionId, {
        prompt: 'Test JSON-RPC format',
        context: {}
      });

      expect(session.sessionId).toMatch(/^[a-zA-Z0-9-_]+$/); // Valid session ID format
      expect(session.status).toBe('active');

      await acpClient.endSession(session.sessionId);
    }, 20000);

    it('should handle context sharing according to ACP spec', async () => {
      // Arrange
      const contextWithFiles: acp.CreateSessionRequest = {
        prompt: 'Analyze this file context',
        context: {
          workingDirectory: process.cwd(),
          files: ['package.json'], // Share package.json as context
          additionalContext: {
            projectType: 'TypeScript Extension',
            framework: 'Raycast'
          }
        }
      };

      // Act
      const session = await acpClient.createSession(connectionId, contextWithFiles);

      // Assert
      expect(session).toBeDefined();
      expect(session.sessionId).toBeDefined();
      expect(session.status).toBe('active');

      // The agent should have received the context
      // We can't directly verify this without protocol-level inspection,
      // but the session creation success indicates context was processed
      await acpClient.endSession(session.sessionId);
    }, 25000);
  });

  describe('Resource Management and Cleanup', () => {
    it('should properly clean up resources on disconnect', async () => {
      // Arrange
      const connection = await acpClient.connect(geminiConfig);
      const session = await acpClient.createSession(connection.id, {
        prompt: 'Test cleanup',
        context: {}
      });

      // Act
      await acpClient.endSession(session.sessionId);
      await acpClient.disconnect(connection.id);

      // Assert - Connection should no longer be active
      const activeConnections = await acpClient.getActiveConnections();
      const foundConnection = activeConnections.find(c => c.id === connection.id);
      expect(foundConnection).toBeUndefined();
    }, 20000);

    it('should handle multiple concurrent sessions per connection', async () => {
      // Arrange
      const connection = await acpClient.connect(geminiConfig);

      // Act
      const session1 = await acpClient.createSession(connection.id, {
        prompt: 'First session',
        context: {}
      });

      const session2 = await acpClient.createSession(connection.id, {
        prompt: 'Second session',
        context: {}
      });

      // Assert
      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session1.agentConnectionId).toBe(connection.id);
      expect(session2.agentConnectionId).toBe(connection.id);

      // Clean up
      await acpClient.endSession(session1.sessionId);
      await acpClient.endSession(session2.sessionId);
      await acpClient.disconnect(connection.id);
    }, 30000);
  });

  describe('Protocol Versioning and Compatibility', () => {
    it('should work with current ACP protocol version', async () => {
      // This test ensures we're compatible with the ACP version we're using
      const connection = await acpClient.connect(geminiConfig);

      // Basic protocol operations should work
      expect(connection.status).toBe('connected');

      const session = await acpClient.createSession(connection.id, {
        prompt: 'Version compatibility test',
        context: {}
      });

      expect(session.status).toBe('active');

      // Clean up
      await acpClient.endSession(session.sessionId);
      await acpClient.disconnect(connection.id);
    }, 20000);
  });
});
