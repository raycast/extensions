import { showToast, Toast } from "@raycast/api";
import {
  Site,
  getCustomPlatforms,
  defaultSites,
  getPlatformSettings,
  updatePlatformSettings,
  STORAGE_KEYS,
} from "./sites";
import { LocalStorage } from "@raycast/api";

export interface CustomAppInput {
  name: string;
  urlTemplate: string;
  enabled?: boolean;
}

export interface CustomAppUpdate {
  name?: string;
  urlTemplate?: string;
  enabled?: boolean;
}

/**
 * Validates that a value is slug-safe (only contains lowercase letters, numbers, and hyphens)
 */
function isSlugSafe(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value);
}

/**
 * Generates a slug-safe value from a name
 */
function generateSlugFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Checks if a platform value is unique across all platforms (default + custom)
 */
async function isValueUnique(value: string, excludeValue?: string): Promise<boolean> {
  // Check against default sites
  const defaultValueExists = defaultSites.some((site) => site.value === value);
  if (defaultValueExists) {
    return false;
  }

  // Check against custom platforms
  const customPlatforms = await getCustomPlatforms();
  const customValueExists = customPlatforms.some(
    (platform) => platform.value === value && platform.value !== excludeValue,
  );

  return !customValueExists;
}

/**
 * Validates custom app input
 */
async function validateCustomAppInput(
  input: CustomAppInput,
  excludeValue?: string,
): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = [];

  // Validate name
  if (!input.name?.trim()) {
    errors.push("Platform name is required");
  }

  // Validate URL template
  if (!input.urlTemplate?.trim()) {
    errors.push("URL template is required");
  } else if (!input.urlTemplate.includes("{profile}")) {
    errors.push("URL template must contain {profile} placeholder");
  }

  // Generate and validate slug
  if (input.name?.trim()) {
    const slug = generateSlugFromName(input.name);

    if (!slug) {
      errors.push("Platform name must contain at least one alphanumeric character");
    } else if (!isSlugSafe(slug)) {
      errors.push("Platform name generates invalid slug (must only contain lowercase letters, numbers, and hyphens)");
    } else {
      const isUnique = await isValueUnique(slug, excludeValue);
      if (!isUnique) {
        errors.push("A platform with this name already exists (or generates the same slug)");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Adds a new custom platform with validation and toast feedback
 */
export async function addCustomApp(input: CustomAppInput): Promise<{ success: boolean; value?: string }> {
  try {
    // Validate input
    const validation = await validateCustomAppInput(input);
    if (!validation.isValid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add Platform",
        message: validation.errors[0], // Show first error
      });
      return { success: false };
    }

    // Generate slug-safe value
    const value = generateSlugFromName(input.name);

    // Create the platform
    const newPlatform: Site = {
      name: input.name.trim(),
      value,
      urlTemplate: input.urlTemplate.trim(),
    };

    // Add to custom platforms
    const customPlatforms = await getCustomPlatforms();
    const updatedPlatforms = [...customPlatforms, newPlatform];
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, JSON.stringify(updatedPlatforms));

    // Handle platform settings if not enabled by default
    if (input.enabled === false) {
      const currentSettings = await getPlatformSettings();
      const updatedSettings = [...currentSettings, { value, enabled: false }];
      await updatePlatformSettings(updatedSettings);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Platform Added",
      message: `${input.name} has been added successfully`,
    });

    return { success: true, value };
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Add Platform",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
    return { success: false };
  }
}

/**
 * Updates an existing custom platform with validation and toast feedback
 */
export async function updateCustomApp(
  currentValue: string,
  updates: CustomAppUpdate,
): Promise<{ success: boolean; newValue?: string }> {
  try {
    const customPlatforms = await getCustomPlatforms();
    const platformIndex = customPlatforms.findIndex((p) => p.value === currentValue);

    if (platformIndex === -1) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Platform",
        message: "Platform not found",
      });
      return { success: false };
    }

    const currentPlatform = customPlatforms[platformIndex];

    // Prepare the updated data
    const updatedInput: CustomAppInput = {
      name: updates.name ?? currentPlatform.name,
      urlTemplate: updates.urlTemplate ?? currentPlatform.urlTemplate,
      enabled: updates.enabled,
    };

    // Validate the updates
    const validation = await validateCustomAppInput(updatedInput, currentValue);
    if (!validation.isValid) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Update Platform",
        message: validation.errors[0],
      });
      return { success: false };
    }

    // Generate new value if name changed
    const newValue = generateSlugFromName(updatedInput.name);
    const valueChanged = newValue !== currentValue;

    // Update the platform
    const updatedPlatform: Site = {
      name: updatedInput.name.trim(),
      value: newValue,
      urlTemplate: updatedInput.urlTemplate.trim(),
    };

    customPlatforms[platformIndex] = updatedPlatform;
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, JSON.stringify(customPlatforms));

    // Handle platform settings
    const currentSettings = await getPlatformSettings();

    if (valueChanged) {
      // Remove old setting and add new one
      const filteredSettings = currentSettings.filter((s) => s.value !== currentValue);
      const updatedSettings = [...filteredSettings];

      // Add new setting if enabled state is specified or if old setting existed
      const oldSettingExists = currentSettings.some((s) => s.value === currentValue);
      if (updatedInput.enabled !== undefined || oldSettingExists) {
        const enabled =
          updatedInput.enabled ??
          (oldSettingExists ? (currentSettings.find((s) => s.value === currentValue)?.enabled ?? true) : true);
        updatedSettings.push({ value: newValue, enabled });
      }

      await updatePlatformSettings(updatedSettings);
    } else {
      // Update existing setting if enabled state is specified
      if (updatedInput.enabled !== undefined) {
        const existingSettingIndex = currentSettings.findIndex((s) => s.value === currentValue);
        if (existingSettingIndex >= 0) {
          currentSettings[existingSettingIndex].enabled = updatedInput.enabled;
        } else {
          currentSettings.push({ value: currentValue, enabled: updatedInput.enabled });
        }
        await updatePlatformSettings(currentSettings);
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Platform Updated",
      message: `${updatedInput.name} has been updated successfully`,
    });

    return { success: true, newValue };
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Update Platform",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
    return { success: false };
  }
}

/**
 * Removes a custom platform with toast feedback
 */
export async function removeCustomApp(value: string): Promise<{ success: boolean }> {
  try {
    const customPlatforms = await getCustomPlatforms();
    const platformToRemove = customPlatforms.find((p) => p.value === value);

    if (!platformToRemove) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Remove Platform",
        message: "Platform not found",
      });
      return { success: false };
    }

    // Remove from custom platforms
    const updatedPlatforms = customPlatforms.filter((p) => p.value !== value);
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, JSON.stringify(updatedPlatforms));

    // Remove from platform settings
    const currentSettings = await getPlatformSettings();
    const updatedSettings = currentSettings.filter((s) => s.value !== value);
    await updatePlatformSettings(updatedSettings);

    await showToast({
      style: Toast.Style.Success,
      title: "Platform Removed",
      message: `${platformToRemove.name} has been removed successfully`,
    });

    return { success: true };
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Remove Platform",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
    return { success: false };
  }
}

/**
 * Helper function to check if a platform value exists
 */
export async function platformExists(value: string): Promise<boolean> {
  const customPlatforms = await getCustomPlatforms();
  const defaultExists = defaultSites.some((site) => site.value === value);
  const customExists = customPlatforms.some((platform) => platform.value === value);
  return defaultExists || customExists;
}

/**
 * Helper function to get a platform by value (from both default and custom)
 */
export async function getPlatformByValue(value: string): Promise<Site | null> {
  // Check default sites first
  const defaultSite = defaultSites.find((site) => site.value === value);
  if (defaultSite) {
    return defaultSite;
  }

  // Check custom platforms
  const customPlatforms = await getCustomPlatforms();
  const customPlatform = customPlatforms.find((platform) => platform.value === value);
  return customPlatform || null;
}
