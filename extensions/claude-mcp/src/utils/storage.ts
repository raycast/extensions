/**
 * Profile storage system using Raycast LocalStorage API
 */

import { LocalStorage } from "@raycast/api";
import {
  MCPProfile,
  CreateProfileInput,
  UpdateProfileInput,
  ProfileSummary,
  StorageResult,
  ValidationResult,
  ProfileId,
} from "../types";

// Storage keys
const STORAGE_KEYS = {
  PROFILES: "mcp_profiles",
  ACTIVE_PROFILE: "active_profile_id",
  PROFILE_STATS: "profile_stats",
} as const;

// Profile statistics interface
interface ProfileStats {
  [profileId: string]: {
    usageCount: number;
    lastUsed: string; // ISO date string
  };
}

/**
 * Generate unique profile ID
 */
function generateProfileId(): string {
  return `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Serialize profile for storage (handle Date objects)
 */
function serializeProfile(profile: MCPProfile): string {
  const serializable = {
    ...profile,
    createdAt: profile.createdAt.toISOString(),
    lastUsed: profile.lastUsed?.toISOString() || null,
  };
  return JSON.stringify(serializable);
}

/**
 * Deserialize profile from storage (restore Date objects)
 */
function deserializeProfile(profileData: string): MCPProfile {
  const parsed = JSON.parse(profileData);
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
    lastUsed: parsed.lastUsed ? new Date(parsed.lastUsed) : undefined,
  };
}

/**
 * Validate profile data
 */
function validateProfile(profile: Partial<MCPProfile>): ValidationResult {
  const errors: string[] = [];

  if (!profile.name || profile.name.trim().length === 0) {
    errors.push("Profile name is required");
  }

  if (!profile.mcpServers || typeof profile.mcpServers !== "object") {
    errors.push("MCP servers configuration is required");
  } else {
    // Validate each server configuration
    for (const [serverName, config] of Object.entries(profile.mcpServers)) {
      if (!config.command || config.command.trim().length === 0) {
        errors.push(`Server "${serverName}" requires a command`);
      }
      if (!Array.isArray(config.args)) {
        errors.push(`Server "${serverName}" args must be an array`);
      }
      if (config.env && typeof config.env !== "object") {
        errors.push(`Server "${serverName}" env must be an object`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Save a profile to storage
 */
export async function saveProfile(input: CreateProfileInput): Promise<StorageResult<MCPProfile>> {
  try {
    // Validate input
    const validation = validateProfile(input);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(", ")}`,
      };
    }

    // Create profile with generated fields
    const profile: MCPProfile = {
      id: generateProfileId(),
      ...input,
      createdAt: new Date(),
    };

    // Get existing profiles
    const existingProfiles = await getAllProfiles();
    if (!existingProfiles.success) {
      return {
        success: false,
        error: "Failed to load existing profiles",
      };
    }

    // Check for duplicate names
    const profiles = existingProfiles.data || [];
    if (profiles.some((p) => p.name === profile.name)) {
      return {
        success: false,
        error: `Profile with name "${profile.name}" already exists`,
      };
    }

    // Add new profile
    profiles.push(profile);

    // Serialize and store all profiles
    const serializedProfiles = profiles.map((p) => ({ [p.id]: serializeProfile(p) }));
    const profilesObject = Object.assign({}, ...serializedProfiles);

    await LocalStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profilesObject));

    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to save profile: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update an existing profile
 */
export async function updateProfile(id: ProfileId, updates: UpdateProfileInput): Promise<StorageResult<MCPProfile>> {
  try {
    // Get existing profile
    const existingProfile = await getProfile(id);
    if (!existingProfile.success || !existingProfile.data) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    // Merge updates
    const updatedProfile: MCPProfile = {
      ...existingProfile.data,
      ...updates,
      id, // Ensure ID cannot be changed
      createdAt: existingProfile.data.createdAt, // Ensure createdAt cannot be changed
    };

    // Validate updated profile
    const validation = validateProfile(updatedProfile);
    if (!validation.valid) {
      return {
        success: false,
        error: `Validation failed: ${validation.errors.join(", ")}`,
      };
    }

    // Get all profiles and update the specific one
    const allProfiles = await getAllProfiles();
    if (!allProfiles.success || !allProfiles.data) {
      return {
        success: false,
        error: "Failed to load profiles",
      };
    }

    const profiles = allProfiles.data.map((p) => (p.id === id ? updatedProfile : p));

    // Serialize and store
    const serializedProfiles = profiles.map((p) => ({ [p.id]: serializeProfile(p) }));
    const profilesObject = Object.assign({}, ...serializedProfiles);

    await LocalStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profilesObject));

    return {
      success: true,
      data: updatedProfile,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to update profile: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get a specific profile by ID
 */
export async function getProfile(id: ProfileId): Promise<StorageResult<MCPProfile>> {
  try {
    const profilesData = await LocalStorage.getItem<string>(STORAGE_KEYS.PROFILES);
    if (!profilesData) {
      return {
        success: false,
        error: "No profiles found",
      };
    }

    const profilesObject = JSON.parse(profilesData);
    const profileData = profilesObject[id];

    if (!profileData) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    const profile = deserializeProfile(profileData);
    return {
      success: true,
      data: profile,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get profile: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get all profiles
 */
export async function getAllProfiles(): Promise<StorageResult<MCPProfile[]>> {
  try {
    const profilesData = await LocalStorage.getItem<string>(STORAGE_KEYS.PROFILES);
    if (!profilesData) {
      return {
        success: true,
        data: [],
      };
    }

    const profilesObject = JSON.parse(profilesData);
    const profiles: MCPProfile[] = [];

    for (const [id, profileData] of Object.entries(profilesObject)) {
      try {
        const profile = deserializeProfile(profileData as string);
        profiles.push(profile);
      } catch (error) {
        console.warn(`Failed to deserialize profile ${id}:`, error);
        // Continue with other profiles
      }
    }

    // Sort by creation date (newest first)
    profiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return {
      success: true,
      data: profiles,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get profiles: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Delete a profile
 */
export async function deleteProfile(id: ProfileId): Promise<StorageResult<boolean>> {
  try {
    // Get all profiles
    const allProfiles = await getAllProfiles();
    if (!allProfiles.success || !allProfiles.data) {
      return {
        success: false,
        error: "Failed to load profiles",
      };
    }

    // Check if profile exists
    const profileExists = allProfiles.data.some((p) => p.id === id);
    if (!profileExists) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    // Remove profile from list
    const remainingProfiles = allProfiles.data.filter((p) => p.id !== id);

    // Update storage
    if (remainingProfiles.length === 0) {
      await LocalStorage.removeItem(STORAGE_KEYS.PROFILES);
    } else {
      const serializedProfiles = remainingProfiles.map((p) => ({ [p.id]: serializeProfile(p) }));
      const profilesObject = Object.assign({}, ...serializedProfiles);
      await LocalStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profilesObject));
    }

    // Clear active profile if it was the deleted one
    const activeProfile = await getActiveProfile();
    if (activeProfile.success && activeProfile.data === id) {
      await LocalStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
    }

    // Clean up stats
    await removeProfileStats(id);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to delete profile: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Set the active profile
 */
export async function setActiveProfile(id: ProfileId): Promise<StorageResult<boolean>> {
  try {
    // Verify profile exists
    const profile = await getProfile(id);
    if (!profile.success) {
      return {
        success: false,
        error: "Profile not found",
      };
    }

    await LocalStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, id);

    // Update usage statistics
    await updateProfileStats(id);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to set active profile: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get the currently active profile ID
 */
export async function getActiveProfile(): Promise<StorageResult<ProfileId | null>> {
  try {
    const activeId = await LocalStorage.getItem<string>(STORAGE_KEYS.ACTIVE_PROFILE);
    return {
      success: true,
      data: activeId || null,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get active profile: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get profile summaries for list views
 */
export async function getProfileSummaries(): Promise<StorageResult<ProfileSummary[]>> {
  try {
    const allProfiles = await getAllProfiles();
    if (!allProfiles.success || !allProfiles.data) {
      return {
        success: false,
        error: "Failed to load profiles",
      };
    }

    const activeProfile = await getActiveProfile();
    const activeId = activeProfile.success ? activeProfile.data : null;

    const summaries: ProfileSummary[] = allProfiles.data.map((profile) => ({
      id: profile.id,
      name: profile.name,
      description: profile.description,
      serverCount: Object.keys(profile.mcpServers).length,
      createdAt: profile.createdAt,
      lastUsed: profile.lastUsed,
      isActive: profile.id === activeId,
    }));

    return {
      success: true,
      data: summaries,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get profile summaries: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Update profile usage statistics
 */
async function updateProfileStats(id: ProfileId): Promise<void> {
  try {
    const statsData = await LocalStorage.getItem<string>(STORAGE_KEYS.PROFILE_STATS);
    const stats: ProfileStats = statsData ? JSON.parse(statsData) : {};

    stats[id] = {
      usageCount: (stats[id]?.usageCount || 0) + 1,
      lastUsed: new Date().toISOString(),
    };

    await LocalStorage.setItem(STORAGE_KEYS.PROFILE_STATS, JSON.stringify(stats));
  } catch (error) {
    console.warn("Failed to update profile stats:", error);
    // Non-critical error, don't throw
  }
}

/**
 * Remove profile statistics
 */
async function removeProfileStats(id: ProfileId): Promise<void> {
  try {
    const statsData = await LocalStorage.getItem<string>(STORAGE_KEYS.PROFILE_STATS);
    if (!statsData) return;

    const stats: ProfileStats = JSON.parse(statsData);
    delete stats[id];

    if (Object.keys(stats).length === 0) {
      await LocalStorage.removeItem(STORAGE_KEYS.PROFILE_STATS);
    } else {
      await LocalStorage.setItem(STORAGE_KEYS.PROFILE_STATS, JSON.stringify(stats));
    }
  } catch (error) {
    console.warn("Failed to remove profile stats:", error);
    // Non-critical error, don't throw
  }
}

/**
 * Clear all profile data (for testing/reset purposes)
 */
export async function clearAllProfiles(): Promise<StorageResult<boolean>> {
  try {
    await LocalStorage.removeItem(STORAGE_KEYS.PROFILES);
    await LocalStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
    await LocalStorage.removeItem(STORAGE_KEYS.PROFILE_STATS);

    return {
      success: true,
      data: true,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to clear profiles: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
