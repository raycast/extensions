/**
 * Role-specific interfaces following Interface Segregation Principle
 * Focused contracts for different operational concerns
 */

import { MCPProfile, ProfileSummary, StorageResult, ProfileId } from "../../types";
import {
  CreateProfileInput,
  UpdateProfileInput,
  ProfileMetadata,
  ProfileConfiguration,
} from "../../types/profile-types";

/**
 * Read-only profile operations
 */
export interface IProfileReader {
  getProfile(id: ProfileId): Promise<StorageResult<MCPProfile>>;
  getAllProfiles(): Promise<StorageResult<MCPProfile[]>>;
  getProfileSummaries(): Promise<StorageResult<ProfileSummary[]>>;
  getActiveProfile(): Promise<StorageResult<ProfileId | null>>;
}

/**
 * Write-only profile operations
 */
export interface IProfileWriter {
  saveProfile(input: CreateProfileInput): Promise<StorageResult<MCPProfile>>;
  updateProfile(id: ProfileId, updates: UpdateProfileInput): Promise<StorageResult<MCPProfile>>;
  deleteProfile(id: ProfileId): Promise<StorageResult<boolean>>;
  setActiveProfile(id: ProfileId): Promise<StorageResult<boolean>>;
}

/**
 * Profile metadata operations
 */
export interface IProfileMetadataManager {
  updateMetadata(id: ProfileId, metadata: Partial<ProfileMetadata>): Promise<StorageResult<boolean>>;
  checkNameAvailability(name: string, excludeId?: ProfileId): Promise<boolean>;
  generateUniqueId(): string;
}

/**
 * Profile configuration operations
 */
export interface IProfileConfigurationManager {
  updateConfiguration(id: ProfileId, config: Partial<ProfileConfiguration>): Promise<StorageResult<boolean>>;
  validateConfiguration(config: ProfileConfiguration): Promise<boolean>;
  migrateConfiguration(id: ProfileId, fromVersion: string, toVersion: string): Promise<StorageResult<boolean>>;
}

/**
 * Profile lifecycle operations
 */
export interface IProfileLifecycleManager {
  createProfile(input: CreateProfileInput): Promise<StorageResult<MCPProfile>>;
  archiveProfile(id: ProfileId): Promise<StorageResult<boolean>>;
  restoreProfile(id: ProfileId): Promise<StorageResult<boolean>>;
  duplicateProfile(id: ProfileId, newName: string): Promise<StorageResult<MCPProfile>>;
}

/**
 * Profile usage tracking
 */
export interface IProfileUsageTracker {
  recordUsage(id: ProfileId): Promise<void>;
  getUsageStatistics(id: ProfileId): Promise<
    StorageResult<{
      usageCount: number;
      lastUsed?: Date;
      averageSessionLength?: number;
    }>
  >;
  clearUsageHistory(id: ProfileId): Promise<StorageResult<boolean>>;
}

/**
 * Profile search and filtering
 */
export interface IProfileSearcher {
  searchProfiles(query: string): Promise<StorageResult<ProfileSummary[]>>;
  filterProfiles(criteria: {
    hasDescription?: boolean;
    serverCountMin?: number;
    serverCountMax?: number;
    createdAfter?: Date;
    createdBefore?: Date;
    lastUsedAfter?: Date;
    isActive?: boolean;
  }): Promise<StorageResult<ProfileSummary[]>>;
  sortProfiles(
    profiles: ProfileSummary[],
    sortBy: "name" | "created" | "lastUsed" | "serverCount",
    order: "asc" | "desc",
  ): ProfileSummary[];
}

/**
 * Profile import/export operations
 */
export interface IProfilePortManager {
  exportProfile(id: ProfileId): Promise<StorageResult<string>>;
  exportAllProfiles(): Promise<StorageResult<string>>;
  importProfile(data: string): Promise<StorageResult<MCPProfile>>;
  importProfiles(data: string): Promise<StorageResult<MCPProfile[]>>;
  validateImportData(data: string): Promise<StorageResult<boolean>>;
}
