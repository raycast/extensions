/**
 * Focused profile type definitions following Interface Segregation Principle
 * Splits large interfaces into smaller, role-specific contracts
 */

import { MCPServersConfig, ProfileId } from "./index";

/**
 * Profile metadata - basic identification information
 */
export interface ProfileMetadata {
  id: ProfileId;
  name: string;
  description?: string;
}

/**
 * Profile timestamps - creation and usage tracking
 */
export interface ProfileTimestamps {
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * Profile configuration - technical MCP server setup
 */
export interface ProfileConfiguration {
  mcpServers: MCPServersConfig;
}

/**
 * Profile statistics - usage and summary information
 */
export interface ProfileStatistics {
  serverCount: number;
  usageCount?: number;
  isActive: boolean;
}

/**
 * Complete profile combining all aspects
 */
export interface MCPProfile extends ProfileMetadata, ProfileTimestamps, ProfileConfiguration {}

/**
 * Profile creation input (excludes auto-generated fields)
 */
export interface CreateProfileInput extends Omit<ProfileMetadata, "id">, ProfileConfiguration {
  createdAt?: never; // Explicitly exclude createdAt from input
  lastUsed?: never; // Explicitly exclude lastUsed from input
}

/**
 * Profile update input (partial profile excluding id and createdAt)
 */
export interface UpdateProfileInput extends Partial<ProfileMetadata>, Partial<ProfileConfiguration> {
  id?: never; // ID cannot be updated
  createdAt?: never; // Creation date cannot be updated
  lastUsed?: Date; // Last used can be updated
}

/**
 * Profile summary for list views
 */
export interface ProfileSummary extends ProfileMetadata, ProfileTimestamps, ProfileStatistics {}

/**
 * Profile display information for UI components
 */
export interface ProfileDisplayInfo extends ProfileMetadata {
  subtitle?: string;
  accessories?: Array<{
    text: string;
    icon?: {
      source: string;
      tintColor?: string;
    };
  }>;
}

/**
 * Profile validation context
 */
export interface ProfileValidationContext {
  isCreate: boolean;
  existingProfileIds: ProfileId[];
  existingProfileNames: string[];
  excludeId?: ProfileId;
}
