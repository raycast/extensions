/**
 * Core data models and types for Claude MCP profile management
 */

/**
 * MCP server configuration for a single server
 */
export interface MCPServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
}

/**
 * Configuration object containing all MCP servers
 */
export interface MCPServersConfig {
  [serverName: string]: MCPServerConfig;
}

/**
 * Complete MCP profile containing all configuration and metadata
 */
export interface MCPProfile {
  id: string;
  name: string;
  description?: string;
  mcpServers: MCPServersConfig;
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * Profile creation input (excludes auto-generated fields)
 */
export interface CreateProfileInput {
  name: string;
  description?: string;
  mcpServers: MCPServersConfig;
}

/**
 * Profile update input (partial profile excluding id and createdAt)
 */
export interface UpdateProfileInput {
  name?: string;
  description?: string;
  mcpServers?: MCPServersConfig;
  lastUsed?: Date;
}

/**
 * Profile summary for list views
 */
export interface ProfileSummary {
  id: string;
  name: string;
  description?: string;
  serverCount: number;
  createdAt: Date;
  lastUsed?: Date;
  isActive: boolean;
}

/**
 * Storage operations result
 */
export interface StorageResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Profile validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Common profile operations
 */
export type ProfileId = string;
export type ServerName = string;
