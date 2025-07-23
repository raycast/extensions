import { showToast, Toast, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCustomApps, defaultApps, getAppSettings, updateAppSettings, STORAGE_KEYS } from "../hooks/apps";
import { App, CustomAppInput, CustomAppUpdate } from "../types";

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
 * Checks if an app value is unique across all apps (default + custom)
 */
async function isValueUnique(value: string, excludeValue?: string): Promise<boolean> {
  // Check against default sites
  const defaultValueExists = defaultApps.some((site) => site.value === value);
  if (defaultValueExists) {
    return false;
  }

  // Check against custom apps
  const customApps = await getCustomApps();
  const customValueExists = customApps.some((app) => app.value === value && app.value !== excludeValue);

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
    errors.push("App name is required");
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
      errors.push("App name must contain at least one alphanumeric character");
    } else if (!isSlugSafe(slug)) {
      errors.push("App name generates invalid slug (must only contain lowercase letters, numbers, and hyphens)");
    } else {
      const isUnique = await isValueUnique(slug, excludeValue);
      if (!isUnique) {
        errors.push("A social app with this name already exists (or generates the same slug)");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Adds a new custom app with validation and toast feedback
 */
export async function addCustomApp(input: CustomAppInput): Promise<{ success: boolean; value?: string }> {
  try {
    // Validate input
    const validation = await validateCustomAppInput(input);
    if (!validation.isValid) {
      await showFailureToast(validation.errors[0], { title: "Failed to Add Social App" });
      return { success: false };
    }

    // Generate slug-safe value
    const value = generateSlugFromName(input.name);

    // Create the app
    const newApp: App = {
      name: input.name.trim(),
      value,
      urlTemplate: input.urlTemplate.trim(),
    };

    // Add to custom apps
    const customApps = await getCustomApps();
    const updatedApps = [...customApps, newApp];
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updatedApps));

    // Handle app settings if not enabled by default
    if (input.enabled === false) {
      const currentSettings = await getAppSettings();
      const updatedSettings = [...currentSettings, { value, enabled: false }];
      await updateAppSettings(updatedSettings);
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Social App Added",
      message: `${input.name} has been added successfully`,
    });

    return { success: true, value };
  } catch (error) {
    await showFailureToast(error instanceof Error ? error.message : "An unexpected error occurred", {
      title: "Failed to Add Social App",
    });
    return { success: false };
  }
}

/**
 * Updates an existing custom app with validation and toast feedback
 */
export async function updateCustomApp(
  currentValue: string,
  updates: CustomAppUpdate,
): Promise<{ success: boolean; newValue?: string }> {
  try {
    const customApps = await getCustomApps();
    const appIndex = customApps.findIndex((p) => p.value === currentValue);

    if (appIndex === -1) {
      await showFailureToast("App not found", { title: "Failed to Update Social App" });
      return { success: false };
    }

    const currentApp = customApps[appIndex];

    // Prepare the updated data
    const updatedInput: CustomAppInput = {
      name: updates.name ?? currentApp.name,
      urlTemplate: updates.urlTemplate ?? currentApp.urlTemplate,
      enabled: updates.enabled,
    };

    // Validate the updates
    const validation = await validateCustomAppInput(updatedInput, currentValue);
    if (!validation.isValid) {
      await showFailureToast(validation.errors[0], { title: "Failed to Update Social App" });
      return { success: false };
    }

    // Generate new value if name changed
    const newValue = generateSlugFromName(updatedInput.name);
    const valueChanged = newValue !== currentValue;

    // Update the app
    const updatedApp: App = {
      name: updatedInput.name.trim(),
      value: newValue,
      urlTemplate: updatedInput.urlTemplate.trim(),
    };

    customApps[appIndex] = updatedApp;
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(customApps));

    // Handle app settings
    const currentSettings = await getAppSettings();

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

      await updateAppSettings(updatedSettings);
    } else {
      // Update existing setting if enabled state is specified
      if (updatedInput.enabled !== undefined) {
        const existingSettingIndex = currentSettings.findIndex((s) => s.value === currentValue);
        if (existingSettingIndex >= 0) {
          currentSettings[existingSettingIndex].enabled = updatedInput.enabled;
        } else {
          currentSettings.push({ value: currentValue, enabled: updatedInput.enabled });
        }
        await updateAppSettings(currentSettings);
      }
    }

    await showToast({
      style: Toast.Style.Success,
      title: "Social App Updated",
      message: `${updatedInput.name} has been updated successfully`,
    });

    return { success: true, newValue };
  } catch (error) {
    await showFailureToast(error instanceof Error ? error.message : "An unexpected error occurred", {
      title: "Failed to Update Social App",
    });
    return { success: false };
  }
}

/**
 * Removes a custom app with toast feedback
 */
export async function removeCustomApp(value: string): Promise<{ success: boolean }> {
  try {
    const customApps = await getCustomApps();
    const appToRemove = customApps.find((p) => p.value === value);

    if (!appToRemove) {
      await showFailureToast("App not found", { title: "Failed to Remove Social App" });
      return { success: false };
    }

    // Remove from custom apps
    const updatedApps = customApps.filter((p) => p.value !== value);
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updatedApps));

    // Remove from app settings
    const currentSettings = await getAppSettings();
    const updatedSettings = currentSettings.filter((s) => s.value !== value);
    await updateAppSettings(updatedSettings);

    await showToast({
      style: Toast.Style.Success,
      title: "Social App Removed",
      message: `${appToRemove.name} has been removed successfully`,
    });

    return { success: true };
  } catch (error) {
    await showFailureToast(error instanceof Error ? error.message : "An unexpected error occurred", {
      title: "Failed to Remove Social App",
    });
    return { success: false };
  }
}

/**
 * Helper function to check if an app value exists
 */
export async function appExists(value: string): Promise<boolean> {
  const customApps = await getCustomApps();
  const defaultExists = defaultApps.some((site) => site.value === value);
  const customExists = customApps.some((app) => app.value === value);
  return defaultExists || customExists;
}

/**
 * Helper function to get an app by value (from both default and custom)
 */
export async function getAppByValue(value: string): Promise<App | null> {
  // Check default sites first
  const defaultSite = defaultApps.find((site) => site.value === value);
  if (defaultSite) {
    return defaultSite;
  }

  // Check custom apps
  const customApps = await getCustomApps();
  const customApp = customApps.find((app) => app.value === value);
  return customApp || null;
}
