/**
 * Profile repository interface following Repository pattern
 * Abstracts storage operations for dependency inversion
 */

import {
  MCPProfile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileSummary,
  StorageResult,
  ProfileId,
} from "../../types";

export interface IProfileRepository {
  /**
   * Save a new profile to storage
   */
  saveProfile(input: CreateProfileInput): Promise<StorageResult<MCPProfile>>;

  /**
   * Update an existing profile
   */
  updateProfile(id: ProfileId, updates: UpdateProfileInput): Promise<StorageResult<MCPProfile>>;

  /**
   * Get a specific profile by ID
   */
  getProfile(id: ProfileId): Promise<StorageResult<MCPProfile>>;

  /**
   * Get all profiles
   */
  getAllProfiles(): Promise<StorageResult<MCPProfile[]>>;

  /**
   * Delete a profile
   */
  deleteProfile(id: ProfileId): Promise<StorageResult<boolean>>;

  /**
   * Get profile summaries for list views
   */
  getProfileSummaries(): Promise<StorageResult<ProfileSummary[]>>;

  /**
   * Clear all profile data (for testing/reset purposes)
   */
  clearAllProfiles(): Promise<StorageResult<boolean>>;

  /**
   * Set the active profile
   */
  setActiveProfile(id: ProfileId): Promise<StorageResult<boolean>>;

  /**
   * Get the currently active profile ID
   */
  getActiveProfile(): Promise<StorageResult<ProfileId | null>>;
}
