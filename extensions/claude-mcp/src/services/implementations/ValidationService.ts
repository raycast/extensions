/**
 * Validation service implementation wrapping existing validation functions
 * Provides abstraction layer following Dependency Inversion Principle
 */

import { MCPProfile, MCPServerConfig, MCPServersConfig } from "../../types";
import {
  DetailedValidationResult,
  ValidationSeverity,
  validateProfile,
  validateMCPServer,
  validateMCPServers,
  validateConfiguration,
} from "../../utils/validation";
import { IValidationService } from "../interfaces/IValidationService";
import { IProfileRepository } from "../interfaces/IProfileRepository";

export class ValidationService implements IValidationService {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async validateProfile(profile: Partial<MCPProfile>): Promise<DetailedValidationResult> {
    return validateProfile(profile);
  }

  async validateMCPServer(serverName: string, config: MCPServerConfig): Promise<DetailedValidationResult> {
    return validateMCPServer(serverName, config);
  }

  async validateMCPServers(mcpServers: MCPServersConfig): Promise<DetailedValidationResult> {
    return validateMCPServers(mcpServers);
  }

  validateConfiguration(config: unknown): DetailedValidationResult {
    return validateConfiguration(config);
  }

  async isProfileNameAvailable(name: string, excludeId?: string): Promise<boolean> {
    try {
      const profilesResult = await this.profileRepository.getAllProfiles();

      if (!profilesResult.success || !profilesResult.data) {
        // If we can't get profiles, assume name is available
        return true;
      }

      const profiles = profilesResult.data;
      const existingProfile = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== excludeId);

      return !existingProfile;
    } catch (error) {
      console.warn("Error checking profile name availability:", error);
      // If there's an error, assume name is available to avoid blocking user
      return true;
    }
  }

  async validateProfileCreation(input: Partial<MCPProfile>): Promise<DetailedValidationResult> {
    // Validate the profile structure first
    const structuralValidation = await this.validateProfile(input);

    // If structural validation fails, return early
    if (!structuralValidation.valid) {
      return structuralValidation;
    }

    // Additional validation for creation
    const issues = [...structuralValidation.errors, ...structuralValidation.warnings, ...structuralValidation.info];

    // Check if name is provided for creation
    if (!input.name || input.name.trim().length === 0) {
      issues.push({
        severity: ValidationSeverity.ERROR,
        code: "MISSING_NAME",
        message: "Profile name is required for creation",
        field: "name",
        value: input.name,
      });
    }

    // Check if MCP servers are provided for creation
    if (!input.mcpServers || Object.keys(input.mcpServers).length === 0) {
      issues.push({
        severity: ValidationSeverity.ERROR,
        code: "MISSING_MCP_SERVERS",
        message: "At least one MCP server must be configured",
        field: "mcpServers",
        value: input.mcpServers,
      });
    }

    // Check name uniqueness if name is provided
    if (input.name && input.name.trim().length > 0) {
      const nameAvailable = await this.isProfileNameAvailable(input.name);
      if (!nameAvailable) {
        issues.push({
          severity: ValidationSeverity.ERROR,
          code: "DUPLICATE_NAME",
          message: `Profile with name "${input.name}" already exists`,
          field: "name",
          value: input.name,
        });
      }
    }

    // Categorize issues
    const errors = issues.filter((issue) => issue.severity === ValidationSeverity.ERROR);
    const warnings = issues.filter((issue) => issue.severity === ValidationSeverity.WARNING);
    const info = issues.filter((issue) => issue.severity === ValidationSeverity.INFO);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }

  async validateProfileUpdate(id: string, updates: Partial<MCPProfile>): Promise<DetailedValidationResult> {
    // Get the existing profile
    const existingProfileResult = await this.profileRepository.getProfile(id);
    if (!existingProfileResult.success || !existingProfileResult.data) {
      return {
        valid: false,
        errors: [
          {
            severity: ValidationSeverity.ERROR,
            code: "PROFILE_NOT_FOUND",
            message: `Profile with ID "${id}" not found`,
            field: "id",
            value: id,
          },
        ],
        warnings: [],
        info: [],
      };
    }

    const existingProfile = existingProfileResult.data;

    // Merge updates with existing profile for validation
    const mergedProfile: MCPProfile = {
      ...existingProfile,
      ...updates,
      id: existingProfile.id, // Ensure ID cannot be changed
      createdAt: existingProfile.createdAt, // Ensure creation date cannot be changed
    };

    // Validate the merged profile
    const structuralValidation = await this.validateProfile(mergedProfile);

    // Additional validation for updates
    const issues = [...structuralValidation.errors, ...structuralValidation.warnings, ...structuralValidation.info];

    // Check name uniqueness if name is being updated
    if (updates.name && updates.name !== existingProfile.name) {
      const nameAvailable = await this.isProfileNameAvailable(updates.name, id);
      if (!nameAvailable) {
        issues.push({
          severity: ValidationSeverity.ERROR,
          code: "DUPLICATE_NAME",
          message: `Profile with name "${updates.name}" already exists`,
          field: "name",
          value: updates.name,
        });
      }
    }

    // Validate that ID and createdAt are not being changed
    if ("id" in updates && updates.id !== existingProfile.id) {
      issues.push({
        severity: ValidationSeverity.ERROR,
        code: "IMMUTABLE_FIELD",
        message: "Profile ID cannot be changed",
        field: "id",
        value: updates.id,
      });
    }

    if ("createdAt" in updates && updates.createdAt !== existingProfile.createdAt) {
      issues.push({
        severity: ValidationSeverity.ERROR,
        code: "IMMUTABLE_FIELD",
        message: "Profile creation date cannot be changed",
        field: "createdAt",
        value: updates.createdAt,
      });
    }

    // Categorize issues
    const errors = issues.filter((issue) => issue.severity === ValidationSeverity.ERROR);
    const warnings = issues.filter((issue) => issue.severity === ValidationSeverity.WARNING);
    const info = issues.filter((issue) => issue.severity === ValidationSeverity.INFO);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info,
    };
  }
}
