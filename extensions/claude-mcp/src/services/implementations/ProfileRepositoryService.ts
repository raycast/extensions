/**
 * Profile repository service implementation wrapping existing storage functions
 * Provides abstraction layer following Dependency Inversion Principle
 */

import {
  MCPProfile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileSummary,
  StorageResult,
  ProfileId,
} from "../../types";
import { IProfileRepository } from "../interfaces/IProfileRepository";
import {
  saveProfile,
  updateProfile,
  getProfile,
  getAllProfiles,
  deleteProfile,
  getProfileSummaries,
  clearAllProfiles,
  setActiveProfile,
  getActiveProfile,
} from "../../utils/storage";

export class ProfileRepositoryService implements IProfileRepository {
  async saveProfile(input: CreateProfileInput): Promise<StorageResult<MCPProfile>> {
    try {
      return await saveProfile(input);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async updateProfile(id: ProfileId, updates: UpdateProfileInput): Promise<StorageResult<MCPProfile>> {
    try {
      return await updateProfile(id, updates);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getProfile(id: ProfileId): Promise<StorageResult<MCPProfile>> {
    try {
      return await getProfile(id);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getAllProfiles(): Promise<StorageResult<MCPProfile[]>> {
    try {
      return await getAllProfiles();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async deleteProfile(id: ProfileId): Promise<StorageResult<boolean>> {
    try {
      return await deleteProfile(id);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getProfileSummaries(): Promise<StorageResult<ProfileSummary[]>> {
    try {
      return await getProfileSummaries();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async clearAllProfiles(): Promise<StorageResult<boolean>> {
    try {
      return await clearAllProfiles();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async setActiveProfile(id: ProfileId): Promise<StorageResult<boolean>> {
    try {
      return await setActiveProfile(id);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getActiveProfile(): Promise<StorageResult<ProfileId | null>> {
    try {
      return await getActiveProfile();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
