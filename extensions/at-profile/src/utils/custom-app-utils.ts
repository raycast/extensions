import { showToast, Toast, LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getCustomApps, getAppSettings, updateAppSettings, STORAGE_KEYS } from "../hooks/apps";
import { defaultApps } from "../types/default-apps";
import { App, CustomAppInput, CustomAppUpdate } from "../types";

/**
 * Validates that a value is slug-safe (only contains lowercase letters, numbers, and hyphens)
 */
function isSlugSafe(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value) && !value.startsWith("-") && !value.endsWith("-");
}

/**
 * Generates a stable value from a URL template
 * This approach is more reliable than name-based slugs since URL templates are unique
 */
function generateValueFromUrlTemplate(urlTemplate: string): string {
  if (!urlTemplate || typeof urlTemplate !== "string") {
    return "";
  }

  try {
    // Remove {profile} placeholder and create a URL to extract domain
    const testUrl = urlTemplate.replace(/{profile}/g, "test");
    const url = new URL(testUrl);

    // Extract domain and remove common prefixes, but keep TLD to avoid collisions
    let domain = url.hostname
      .replace(/^www\./i, "") // Remove www.
      .replace(/^m\./i, "") // Remove m. (mobile)
      .replace(/^app\./i, ""); // Remove app.

    // Replace dots with hyphens to make it slug-safe (e.g., mastodon.social → mastodon-social)
    domain = domain.replace(/\./g, "-");

    // Handle special cases for subdomains or paths
    if (url.pathname && url.pathname !== "/" && url.pathname !== "/test") {
      const pathPart = url.pathname
        .replace(/\/test$/i, "") // Remove our test placeholder
        .replace(/^\//i, "") // Remove leading slash
        .split("/")[0] // Take first path segment
        .replace(/[^a-z0-9]/gi, ""); // Clean up

      if (pathPart && pathPart.length > 0) {
        domain = `${domain}-${pathPart}`;
      }
    }

    // Clean and return
    return domain
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "") // Only allow alphanumeric and hyphens
      .replace(/-+/g, "-") // Replace multiple hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  } catch (error) {
    // Fallback: create a hash-like identifier from the URL template
    return urlTemplate
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 20); // Limit length
  }
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

  // Generate and validate value from URL template
  if (input.urlTemplate?.trim()) {
    const value = generateValueFromUrlTemplate(input.urlTemplate);

    if (!value) {
      errors.push("URL template must generate a valid identifier");
    } else if (!isSlugSafe(value)) {
      errors.push("App URL generated invalid identifier (must only contain lowercase letters, numbers, and hyphens)");
    } else {
      const isUnique = await isValueUnique(value, excludeValue);
      if (!isUnique) {
        errors.push("An app with this identifier already exists");
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

    // Generate stable value from URL template
    const value = generateValueFromUrlTemplate(input.urlTemplate);

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
 * Adds a custom app during import process without showing error toasts for duplicates
 * Returns detailed result information for import summary
 */
export async function addCustomAppForImport(
  input: CustomAppInput,
): Promise<{ success: boolean; value?: string; isDuplicate?: boolean; error?: string }> {
  try {
    // Validate input
    if (!input.name?.trim()) {
      return { success: false, error: "App name is required" };
    }
    if (!input.urlTemplate?.trim()) {
      return { success: false, error: "URL template is required" };
    }
    if (!input.urlTemplate.includes("{profile}")) {
      return { success: false, error: "URL template must contain {profile} placeholder" };
    }

    // Generate value from URL template
    const value = generateValueFromUrlTemplate(input.urlTemplate.trim());

    // Check for duplicates
    const customApps = await getCustomApps();
    const isDuplicate = customApps.some((app) => app.value === value);

    if (isDuplicate) {
      return { success: false, isDuplicate: true, value };
    }

    // Create new app
    const newApp: App = {
      name: input.name.trim(),
      value,
      urlTemplate: input.urlTemplate.trim(),
    };

    // Add to custom apps
    const updatedApps = [...customApps, newApp];
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updatedApps));

    // Handle app settings if not enabled by default
    if (input.enabled === false) {
      const currentSettings = await getAppSettings();
      const updatedSettings = [...currentSettings, { value, enabled: false }];
      await updateAppSettings(updatedSettings);
    }

    return { success: true, value };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
    return { success: false, error: errorMessage };
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

    // Generate new value if URL template changed
    const newValue = generateValueFromUrlTemplate(updatedInput.urlTemplate);
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
