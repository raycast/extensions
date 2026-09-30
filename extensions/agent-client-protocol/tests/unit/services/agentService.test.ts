/**
 * Unit Tests for AgentService
 *
 * Tests the core agent connection management functionality including:
 * - Agent connection establishment
 * - Connection health monitoring
 * - Error handling and recovery
 * - Configuration validation
 */

import { AgentService } from '@/services/agentService';
import { ConfigService } from '@/services/configService';
import { ACPClient } from '@/services/acpClient';
import { ErrorCode } from '@/types/extension';
import type { AgentConfig, AgentConnection } from '@/types/extension';

// Mock dependencies
jest.mock('@/services/configService');
jest.mock('@/services/acpClient');

const MockedConfigService = ConfigService as jest.MockedClass<typeof ConfigService>;
const MockedACPClient = ACPClient as jest.MockedClass<typeof ACPClient>;

describe('AgentService', () => {
  let agentService: AgentService;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockACPClient: jest.Mocked<ACPClient>;

  const mockAgentConfig: AgentConfig = {
    id: 'test-agent',
    name: 'Test Agent',
    type: 'subprocess',
    command: 'test-command',
    args: ['--test'],
    workingDirectory: '/test/dir',
    environmentVariables: {},
    isBuiltIn: false,
    description: 'Test agent for unit testing',
    createdAt: new Date('2025-01-01'),
  };

  const mockConnection: AgentConnection = {
    id: 'conn-123',
    agentId: 'test-agent',
    status: 'connected',
    connectedAt: new Date(),
    lastActivity: new Date(),
    sessionCount: 0,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock instances
    mockConfigService = new MockedConfigService() as jest.Mocked<ConfigService>;
    mockACPClient = new MockedACPClient() as jest.Mocked<ACPClient>;

    // Create service instance
    agentService = new AgentService(mockConfigService, mockACPClient);
  });

  afterEach(async () => {
    // Clean up health monitoring to prevent Jest from hanging
    if (agentService) {
      await agentService.cleanup();
    }
  });

  describe('connectToAgent', () => {
    it('should successfully connect to a valid agent', async () => {
      // Arrange
      mockConfigService.getAgentConfigs.mockResolvedValue([mockAgentConfig]);
      mockACPClient.connect.mockResolvedValue(mockConnection);

      // Act
      const result = await agentService.connectToAgent('test-agent');

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe('conn-123');
      expect(result.status).toBe('connected');
      expect(mockACPClient.connect).toHaveBeenCalledWith(mockAgentConfig);
    });

    it('should throw error when agent configuration not found', async () => {
      // Arrange
      mockConfigService.getAgentConfigs.mockResolvedValue([]);

      // Act & Assert
      await expect(agentService.connectToAgent('nonexistent-agent')).rejects.toMatchObject({
        code: ErrorCode.AgentUnavailable,
        message: expect.stringContaining('Agent configuration not found')
      });
    });

    it('should handle connection failures gracefully', async () => {
      // Arrange
      mockConfigService.getAgentConfigs.mockResolvedValue([mockAgentConfig]);
      mockACPClient.connect.mockRejectedValue(new Error('Connection failed'));

      // Act & Assert
      await expect(agentService.connectToAgent('test-agent')).rejects.toMatchObject({
        code: ErrorCode.AgentConnectionFailed,
        message: expect.stringContaining('Failed to connect to agent')
      });
    });

    it('should validate agent configuration before connecting', async () => {
      // Arrange
      const invalidAgent: AgentConfig = {
        ...mockAgentConfig,
        command: '', // Invalid empty command
      };
      mockConfigService.getAgentConfigs.mockResolvedValue([invalidAgent]);

      // Act & Assert
      await expect(agentService.connectToAgent('test-agent')).rejects.toMatchObject({
        code: ErrorCode.InvalidConfiguration,
        message: expect.stringContaining('Invalid agent configuration')
      });
    });
  });

  describe('disconnectAgent', () => {
    it('should successfully disconnect an active connection', async () => {
      // Arrange
      mockACPClient.disconnect.mockResolvedValue(undefined);

      // Act
      await agentService.disconnectAgent('conn-123');

      // Assert
      expect(mockACPClient.disconnect).toHaveBeenCalledWith('conn-123');
    });

    it('should handle disconnect errors gracefully', async () => {
      // Arrange
      mockACPClient.disconnect.mockRejectedValue(new Error('Disconnect failed'));

      // Act & Assert
      await expect(agentService.disconnectAgent('conn-123')).rejects.toMatchObject({
        code: ErrorCode.SystemError,
        message: expect.stringContaining('Failed to disconnect from agent')
      });
    });
  });

  describe('getActiveConnections', () => {
    it('should return list of active connections', async () => {
      // Arrange
      const connections = [mockConnection];
      mockACPClient.getActiveConnections.mockResolvedValue(connections);

      // Act
      const result = await agentService.getActiveConnections();

      // Assert
      expect(result).toEqual(connections);
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('connected');
    });

    it('should return empty array when no connections exist', async () => {
      // Arrange
      mockACPClient.getActiveConnections.mockResolvedValue([]);

      // Act
      const result = await agentService.getActiveConnections();

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('getConnectionHealth', () => {
    it('should return healthy status for active connection', async () => {
      // Arrange
      mockACPClient.checkConnection.mockResolvedValue(true);

      // Act
      const health = await agentService.getConnectionHealth('conn-123');

      // Assert
      expect(health.isHealthy).toBe(true);
      expect(health.lastChecked).toBeInstanceOf(Date);
      expect(mockACPClient.checkConnection).toHaveBeenCalledWith('conn-123');
    });

    it('should return unhealthy status for failed connection', async () => {
      // Arrange
      mockACPClient.checkConnection.mockResolvedValue(false);

      // Act
      const health = await agentService.getConnectionHealth('conn-123');

      // Assert
      expect(health.isHealthy).toBe(false);
      expect(health.error).toBeDefined();
    });

    it('should handle connection check errors', async () => {
      // Arrange
      mockACPClient.checkConnection.mockRejectedValue(new Error('Health check failed'));

      // Act
      const health = await agentService.getConnectionHealth('conn-123');

      // Assert
      expect(health.isHealthy).toBe(false);
      expect(health.error).toContain('Health check failed');
    });
  });

  describe('reconnectAgent', () => {
    it('should successfully reconnect a disconnected agent', async () => {
      // Arrange
      const disconnectedConnection = { ...mockConnection, status: 'disconnected' as const };
      mockACPClient.getConnection.mockResolvedValue(disconnectedConnection);
      mockConfigService.getAgentConfigs.mockResolvedValue([mockAgentConfig]);
      mockACPClient.connect.mockResolvedValue(mockConnection);

      // Act
      const result = await agentService.reconnectAgent('conn-123');

      // Assert
      expect(result.status).toBe('connected');
      expect(mockACPClient.connect).toHaveBeenCalledWith(mockAgentConfig);
    });

    it('should throw error when trying to reconnect healthy connection', async () => {
      // Arrange
      mockACPClient.getConnection.mockResolvedValue(mockConnection);

      // Act & Assert
      await expect(agentService.reconnectAgent('conn-123')).rejects.toMatchObject({
        code: ErrorCode.InvalidConfiguration,
        message: expect.stringContaining('Connection is already active')
      });
    });
  });
});