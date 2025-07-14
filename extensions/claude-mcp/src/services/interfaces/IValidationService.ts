/**
 * Validation service interface for profile and server validation
 * Abstracts validation logic for dependency inversion
 */

import { MCPProfile, MCPServerConfig, MCPServersConfig } from "../../types";
import { DetailedValidationResult } from "../../utils/validation";

export interface IValidationService {
  /**
   * Validate complete MCP profile
   */
  validateProfile(profile: Partial<MCPProfile>): Promise<DetailedValidationResult>;

  /**
   * Validate MCP server configuration
   */
  validateMCPServer(serverName: string, config: MCPServerConfig): Promise<DetailedValidationResult>;

  /**
   * Validate MCP servers configuration
   */
  validateMCPServers(mcpServers: MCPServersConfig): Promise<DetailedValidationResult>;

  /**
   * Validate Claude Desktop configuration structure
   */
  validateConfiguration(config: unknown): DetailedValidationResult;

  /**
   * Check if a profile name is available (not already used)
   */
  isProfileNameAvailable(name: string, excludeId?: string): Promise<boolean>;

  /**
   * Validate profile creation input
   */
  validateProfileCreation(input: Partial<MCPProfile>): Promise<DetailedValidationResult>;

  /**
   * Validate profile update input
   */
  validateProfileUpdate(id: string, updates: Partial<MCPProfile>): Promise<DetailedValidationResult>;
}
