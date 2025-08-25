/**
 * Profile manager interface for high-level profile operations
 * Coordinates between repository, validation, and configuration services
 */

import {
  MCPProfile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileSummary,
  StorageResult,
  ProfileId,
} from "../../types";
import { DetailedValidationResult } from "../../utils/validation";

export interface ProfileSwitchResult {
  success: boolean;
  error?: string;
  totalTime?: number;
  backupPath?: string;
}

export interface IProfileManager {
  /**
   * Create a new profile with validation
   */
  createProfile(input: CreateProfileInput): Promise<StorageResult<MCPProfile>>;

  /**
   * Update an existing profile with validation
   */
  updateProfile(id: ProfileId, updates: UpdateProfileInput): Promise<StorageResult<MCPProfile>>;

  /**
   * Delete a profile and handle cleanup
   */
  deleteProfile(id: ProfileId): Promise<StorageResult<boolean>>;

  /**
   * Get a profile by ID
   */
  getProfile(id: ProfileId): Promise<StorageResult<MCPProfile>>;

  /**
   * Get all profiles
   */
  getAllProfiles(): Promise<StorageResult<MCPProfile[]>>;

  /**
   * Get profile summaries for list views
   */
  getProfileSummaries(): Promise<StorageResult<ProfileSummary[]>>;

  /**
   * Switch to a different profile with full validation and restart
   */
  switchToProfile(profileId: ProfileId): Promise<ProfileSwitchResult>;

  /**
   * Get the currently active profile
   */
  getActiveProfile(): Promise<StorageResult<ProfileId | null>>;

  /**
   * Validate a profile without saving
   */
  validateProfile(profile: Partial<MCPProfile>): Promise<DetailedValidationResult>;

  /**
   * Check if Claude Desktop is properly installed and configured
   */
  checkSystemRequirements(): Promise<StorageResult<boolean>>;

  /**
   * Get system status including configuration and profile information
   */
  getSystemStatus(): Promise<
    StorageResult<{
      claudeInstalled: boolean;
      configExists: boolean;
      configWritable: boolean;
      activeProfile: ProfileId | null;
      totalProfiles: number;
    }>
  >;
}
