import { LocalStorage } from "@raycast/api";
import { showError, showSuccess, withErrorHandling } from "../utils/errors";
import { getCustomApps, getAppSettings, updateAppSettings, STORAGE_KEYS } from "./apps";
import { defaultApps } from "../utils/default-apps";
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
 * Normalizes a URL template for comparison by removing common prefixes and standardizing format
 */
function normalizeUrlTemplate(urlTemplate: string): string {
  if (!urlTemplate || typeof urlTemplate !== "string") {
    return "";
  }

  try {
    // Replace {profile} with a test value to create a valid URL for parsing
    const testUrl = urlTemplate.replace(/{profile}/g, "test");
    const url = new URL(testUrl);

    // Normalize the hostname
    const hostname = url.hostname
      .toLowerCase()
      .replace(/^www\./i, "") // Remove www.
      .replace(/^m\./i, "") // Remove m. (mobile)
      .replace(/^app\./i, ""); // Remove app.

    // Normalize the protocol (always use https for comparison)
    const protocol = "https:";

    // Normalize the pathname (remove test placeholder, normalize slashes)
    const pathname = url.pathname
      .replace(/\/test$/i, "") // Remove our test placeholder
      .replace(/\/+/g, "/") // Normalize multiple slashes
      .replace(/\/$/, ""); // Remove trailing slash

    // Reconstruct normalized URL template
    const normalizedUrl = `${protocol}//${hostname}${pathname}`;

    // Put back the {profile} placeholder where our test value was
    return normalizedUrl.replace(/test/g, "{profile}");
  } catch (error) {
    // If URL parsing fails, return original for comparison
    return urlTemplate.toLowerCase().trim();
  }
}

/**
 * Finds an existing app (default or custom) that has a conflicting URL template
 * Returns the conflicting app or null if no conflict exists
 */
async function findDuplicateApp(urlTemplate: string, excludeValue?: string): Promise<App | null> {
  const normalizedInput = normalizeUrlTemplate(urlTemplate);

  if (!normalizedInput) {
    return null;
  }

  // Check against default apps
  for (const app of defaultApps) {
    if (app.value === excludeValue) continue; // Skip if we're updating this app

    const normalizedDefault = normalizeUrlTemplate(app.urlTemplate);
    if (normalizedInput === normalizedDefault) {
      return app;
    }
  }

  // Check against custom apps
  const customApps = await getCustomApps();
  for (const app of customApps) {
    if (app.value === excludeValue) continue; // Skip if we're updating this app

    const normalizedCustom = normalizeUrlTemplate(app.urlTemplate);
    if (normalizedInput === normalizedCustom) {
      return app;
    }
  }

  return null; // No duplicate found
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
  } else {
    // Validate URL format by testing with a placeholder
    try {
      const testUrl = input.urlTemplate.replace(/{profile}/g, "testuser");
      const parsedUrl = new URL(testUrl);

      // Ensure it's HTTP or HTTPS protocol
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        errors.push("URL template must use http:// or https:// protocol");
      }
    } catch (error) {
      errors.push("URL template must be a valid URL format (e.g., https://example.com/{profile})");
    }

    // Check for URL template duplicates (enhanced duplicate detection)
    const duplicateApp = await findDuplicateApp(input.urlTemplate, excludeValue);
    if (duplicateApp) {
      errors.push(
        `This URL template conflicts with existing app "${duplicateApp.name}". URL templates that point to the same service are not allowed.`,
      );
    }
  }

  // Generate and validate value from URL template for slug safety
  if (input.urlTemplate?.trim()) {
    const value = generateValueFromUrlTemplate(input.urlTemplate);

    if (!value) {
      errors.push("URL template must generate a valid identifier");
    } else if (!isSlugSafe(value)) {
      errors.push("App URL generated invalid identifier (must only contain lowercase letters, numbers, and hyphens)");
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
async function addCustomAppCore(input: CustomAppInput): Promise<{ success: boolean; value?: string }> {
  // Validate input
  const validation = await validateCustomAppInput(input);
  if (!validation.isValid) {
    await showError(validation.errors[0], "Failed to Add App");
    return { success: false };
  }

  // Generate stable value from URL template
  const value = generateValueFromUrlTemplate(input.urlTemplate);

  // Create the app
  const newApp: App = {
    name: input.name.trim(),
    value,
    urlTemplate: input.urlTemplate.trim(),
    placeholder: "username",
  };

  // Add to custom apps
  const customApps = await getCustomApps();
  const updatedApps = [...customApps, newApp];
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updatedApps));

  // Handle app settings if not visible by default
  if (input.visible === false) {
    const currentSettings = await getAppSettings();
    const updatedSettings = [...currentSettings, { value, visible: false }];
    await updateAppSettings(updatedSettings);
  }

  await showSuccess("App Added", `${input.name} has been added successfully`);

  return { success: true, value };
}

export const addCustomApp = withErrorHandling(addCustomAppCore, "adding custom app", true, "Failed to Add App");

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
      placeholder: "username",
    };

    // Add to custom apps
    const updatedApps = [...customApps, newApp];
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updatedApps));

    // Handle app settings if not visible by default
    if (input.visible === false) {
      const currentSettings = await getAppSettings();
      const updatedSettings = [...currentSettings, { value, visible: false }];
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
async function updateCustomAppCore(
  currentValue: string,
  updates: CustomAppUpdate,
): Promise<{ success: boolean; newValue?: string }> {
  const customApps = await getCustomApps();
  const appIndex = customApps.findIndex((p) => p.value === currentValue);

  if (appIndex === -1) {
    await showError("App not found", "Failed to Update App");
    return { success: false };
  }

  const currentApp = customApps[appIndex];

  // Prepare the updated data
  const updatedInput: CustomAppInput = {
    name: updates.name ?? currentApp.name,
    urlTemplate: updates.urlTemplate ?? currentApp.urlTemplate,
    visible: updates.visible,
  };

  // Validate the updates
  const validation = await validateCustomAppInput(updatedInput, currentValue);
  if (!validation.isValid) {
    await showError(validation.errors[0], "Failed to Update App");
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
    placeholder: "username",
  };

  customApps[appIndex] = updatedApp;
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(customApps));

  // Handle app settings
  const currentSettings = await getAppSettings();

  if (valueChanged) {
    // Remove old setting and add new one
    const filteredSettings = currentSettings.filter((s) => s.value !== currentValue);
    const updatedSettings = [...filteredSettings];

    // Add new setting if visible state is specified or if old setting existed
    const oldSettingExists = currentSettings.some((s) => s.value === currentValue);
    if (updatedInput.visible !== undefined || oldSettingExists) {
      const visible =
        updatedInput.visible ??
        (oldSettingExists ? (currentSettings.find((s) => s.value === currentValue)?.visible ?? true) : true);
      updatedSettings.push({ value: newValue, visible });
    }

    await updateAppSettings(updatedSettings);
  } else {
    // Update existing setting if visible state is specified
    if (updatedInput.visible !== undefined) {
      const existingSettingIndex = currentSettings.findIndex((s) => s.value === currentValue);
      if (existingSettingIndex >= 0) {
        currentSettings[existingSettingIndex].visible = updatedInput.visible;
      } else {
        currentSettings.push({ value: currentValue, visible: updatedInput.visible });
      }
      await updateAppSettings(currentSettings);
    }
  }

  await showSuccess("App Updated", `${updatedInput.name} has been updated successfully`);

  return { success: true, newValue };
}

export const updateCustomApp = withErrorHandling(
  updateCustomAppCore,
  "updating custom app",
  true,
  "Failed to Update App",
);

/**
 * Removes a custom app with toast feedback
 */
async function removeCustomAppCore(value: string): Promise<{ success: boolean }> {
  const customApps = await getCustomApps();
  const appToRemove = customApps.find((p) => p.value === value);

  if (!appToRemove) {
    await showError("App not found", "Failed to Remove App");
    return { success: false };
  }

  // Remove from custom apps
  const updatedApps = customApps.filter((p) => p.value !== value);
  await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_APPS, JSON.stringify(updatedApps));

  // Remove from app settings
  const currentSettings = await getAppSettings();
  const updatedSettings = currentSettings.filter((s) => s.value !== value);
  await updateAppSettings(updatedSettings);

  await showSuccess("App Removed", `${appToRemove.name} has been removed successfully`);

  return { success: true };
}

export const removeCustomApp = withErrorHandling(
  removeCustomAppCore,
  "removing custom app",
  true,
  "Failed to Remove App",
);

/**
 * Helper function to check if an app value exists
 */
export async function appExists(value: string): Promise<boolean> {
  const customApps = await getCustomApps();
  const defaultExists = defaultApps.some((app) => app.value === value);
  const customExists = customApps.some((app) => app.value === value);
  return defaultExists || customExists;
}

/**
 * Helper function to get an app by value (from both default and custom)
 */
export async function getAppByValue(value: string): Promise<App | null> {
  // Check default apps first
  const defaultApp = defaultApps.find((app) => app.value === value);
  if (defaultApp) {
    return defaultApp;
  }

  // Check custom apps
  const customApps = await getCustomApps();
  const customApp = customApps.find((app) => app.value === value);
  return customApp || null;
}
