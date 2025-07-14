/**
 * Profile service implementation following Single Responsibility Principle
 * Coordinates profile operations between repository, validation, and configuration services
 */

import { MCPProfile, StorageResult, ProfileId } from "../../types";
import { CreateProfileInput, UpdateProfileInput, ProfileSummary } from "../../types/profile-types";
import { DetailedValidationResult } from "../../utils/validation";
import { IProfileRepository } from "../interfaces/IProfileRepository";
import { IValidationService } from "../interfaces/IValidationService";
import { IConfigurationService } from "../interfaces/IConfigurationService";
import { INotificationService } from "../interfaces/INotificationService";
import { IProfileManager, ProfileSwitchResult } from "../interfaces/IProfileManager";
import { isClaudeInstalled, restartClaudeWithRetry } from "../../utils/process-manager";

export class ProfileService implements IProfileManager {
  constructor(
    private readonly repository: IProfileRepository,
    private readonly validationService: IValidationService,
    private readonly configService: IConfigurationService,
    private readonly notificationService: INotificationService,
  ) {}

  async createProfile(input: CreateProfileInput): Promise<StorageResult<MCPProfile>> {
    try {
      // Validate profile creation input
      const validationResult = await this.validationService.validateProfileCreation(input);

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map((e) => e.message).join(", ");
        return {
          success: false,
          error: `Validation failed: ${errorMessages}`,
        };
      }

      // Check name uniqueness
      const nameAvailable = await this.validationService.isProfileNameAvailable(input.name);
      if (!nameAvailable) {
        return {
          success: false,
          error: `Profile with name "${input.name}" already exists`,
        };
      }

      // Save profile
      const result = await this.repository.saveProfile(input);

      if (result.success) {
        await this.notificationService.showSuccess("Profile created successfully", `"${input.name}" has been created`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await this.notificationService.showError("Failed to create profile", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async updateProfile(id: ProfileId, updates: UpdateProfileInput): Promise<StorageResult<MCPProfile>> {
    try {
      // Validate profile update input
      const validationResult = await this.validationService.validateProfileUpdate(id, updates);

      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map((e) => e.message).join(", ");
        return {
          success: false,
          error: `Validation failed: ${errorMessages}`,
        };
      }

      // Check name uniqueness if name is being updated
      if (updates.name) {
        const nameAvailable = await this.validationService.isProfileNameAvailable(updates.name, id);
        if (!nameAvailable) {
          return {
            success: false,
            error: `Profile with name "${updates.name}" already exists`,
          };
        }
      }

      // Update profile
      const result = await this.repository.updateProfile(id, updates);

      if (result.success) {
        await this.notificationService.showSuccess(
          "Profile updated successfully",
          `"${result.data?.name}" has been updated`,
        );
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await this.notificationService.showError("Failed to update profile", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async deleteProfile(id: ProfileId): Promise<StorageResult<boolean>> {
    try {
      // Get profile to show name in notification
      const profileResult = await this.repository.getProfile(id);
      const profileName = profileResult.data?.name || id;

      const result = await this.repository.deleteProfile(id);

      if (result.success) {
        await this.notificationService.showSuccess("Profile deleted successfully", `"${profileName}" has been deleted`);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await this.notificationService.showError("Failed to delete profile", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getProfile(id: ProfileId): Promise<StorageResult<MCPProfile>> {
    return this.repository.getProfile(id);
  }

  async getAllProfiles(): Promise<StorageResult<MCPProfile[]>> {
    return this.repository.getAllProfiles();
  }

  async getProfileSummaries(): Promise<StorageResult<ProfileSummary[]>> {
    return this.repository.getProfileSummaries();
  }

  async switchToProfile(profileId: ProfileId): Promise<ProfileSwitchResult> {
    const startTime = Date.now();

    try {
      // Check if Claude Desktop is installed
      const installedResult = await isClaudeInstalled();
      if (!installedResult.success || !installedResult.data) {
        return {
          success: false,
          error: "Claude Desktop is not installed at /Applications/Claude.app",
        };
      }

      // Get and validate the profile
      const profileResult = await this.repository.getProfile(profileId);
      if (!profileResult.success || !profileResult.data) {
        return {
          success: false,
          error: profileResult.error || "Profile not found",
        };
      }

      const profile = profileResult.data;

      // Validate profile configuration
      const validationResult = await this.validationService.validateProfile(profile);
      if (!validationResult.valid) {
        const errorMessages = validationResult.errors.map((e) => e.message).join(", ");
        return {
          success: false,
          error: `Profile validation failed: ${errorMessages}`,
        };
      }

      // Show warnings if any
      if (validationResult.warnings.length > 0) {
        const warningMessages = validationResult.warnings.map((w) => w.message).join(", ");
        const shouldContinue = await this.notificationService.showConfirmation({
          title: "Profile has warnings",
          message: `The profile has warnings: ${warningMessages}\n\nDo you want to continue switching?`,
          primaryAction: { title: "Continue" },
          dismissAction: { title: "Cancel" },
        });

        if (!shouldContinue) {
          return {
            success: false,
            error: "Profile switch cancelled by user",
          };
        }
      }

      // Check if already active
      const activeProfileResult = await this.repository.getActiveProfile();
      if (activeProfileResult.success && activeProfileResult.data === profileId) {
        return {
          success: false,
          error: `${profile.name} is already active`,
        };
      }

      // Create backup of current configuration
      const backupResult = await this.configService.createBackup("profile_switch");
      if (!backupResult.success) {
        return {
          success: false,
          error: `Failed to create backup: ${backupResult.error}`,
        };
      }

      const backupPath = backupResult.data!;

      // Read current configuration to preserve non-MCP settings
      const currentConfigResult = await this.configService.readConfiguration();
      if (!currentConfigResult.success) {
        return {
          success: false,
          error: `Failed to read current config: ${currentConfigResult.error}`,
        };
      }

      const currentConfig = currentConfigResult.data || {};

      // Create new configuration with profile's MCP servers
      const newConfig = {
        ...currentConfig,
        mcpServers: profile.mcpServers,
      };

      // Write new configuration
      const writeResult = await this.configService.writeConfiguration(newConfig, "profile_switch");
      if (!writeResult.success) {
        return {
          success: false,
          error: `Failed to write configuration: ${writeResult.error}`,
        };
      }

      // Update active profile in storage
      const setActiveResult = await this.repository.setActiveProfile(profileId);
      if (!setActiveResult.success) {
        console.warn("Failed to update active profile in storage:", setActiveResult.error);
      }

      // Restart Claude Desktop
      const restartResult = await restartClaudeWithRetry();
      if (!restartResult.success) {
        // Attempt to restore backup
        try {
          await this.configService.restoreConfiguration(backupPath);
          return {
            success: false,
            error: `Failed to restart Claude Desktop: ${restartResult.error}. Configuration has been restored from backup.`,
          };
        } catch {
          return {
            success: false,
            error: `Failed to restart Claude Desktop: ${restartResult.error}. CRITICAL: Failed to restore backup.`,
          };
        }
      }

      const totalTime = Date.now() - startTime;

      await this.notificationService.showSuccess(
        `Switched to ${profile.name}`,
        `Claude Desktop restarted in ${Math.round(restartResult.data!.totalTime / 1000)}s`,
      );

      return {
        success: true,
        totalTime,
        backupPath,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      await this.notificationService.showError("Failed to switch profile", errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async getActiveProfile(): Promise<StorageResult<ProfileId | null>> {
    return this.repository.getActiveProfile();
  }

  async validateProfile(profile: Partial<MCPProfile>): Promise<DetailedValidationResult> {
    return this.validationService.validateProfile(profile);
  }

  async checkSystemRequirements(): Promise<StorageResult<boolean>> {
    try {
      const installedResult = await isClaudeInstalled();
      return installedResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  async getSystemStatus(): Promise<
    StorageResult<{
      claudeInstalled: boolean;
      configExists: boolean;
      configWritable: boolean;
      activeProfile: ProfileId | null;
      totalProfiles: number;
    }>
  > {
    try {
      const [claudeResult, configStatusResult, activeProfileResult, profilesResult] = await Promise.all([
        isClaudeInstalled(),
        this.configService.getConfigurationStatus(),
        this.repository.getActiveProfile(),
        this.repository.getAllProfiles(),
      ]);

      return {
        success: true,
        data: {
          claudeInstalled: claudeResult.success && claudeResult.data,
          configExists: configStatusResult.success && configStatusResult.data.exists,
          configWritable: configStatusResult.success && configStatusResult.data.writable,
          activeProfile: activeProfileResult.success ? activeProfileResult.data : null,
          totalProfiles: profilesResult.success ? profilesResult.data?.length || 0 : 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}
