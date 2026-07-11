/**
 * Storage utilities for managing blocked domains using Raycast LocalStorage
 */

import { LocalStorage } from "@raycast/api";

// Storage keys
const BLOCKED_DOMAINS_KEY = "blocked-domains";
const BLOCKING_STATUS_KEY = "blocking-status";
const TEMPORARY_UNBLOCK_KEY = "temporary-unblock";
const CATEGORIES_KEY = "categories";
const SETTINGS_KEY = "settings";

// Types
export interface BlockedDomain {
  domain: string;
  dateAdded: string;
  notes?: string;
  isEnabled: boolean; // Whether this domain is currently enabled for blocking
  categories?: string[]; // Categories/tags for organization
}

export interface BlockingStatus {
  isActive: boolean;
  lastActivated?: string;
  lastDeactivated?: string;
}

export interface TemporaryUnblock {
  isActive: boolean;
  expiresAt?: string; // ISO timestamp when unblock expires
  duration?: number; // Duration in minutes
}

export interface Category {
  name: string;
  color?: string;
  icon?: string;
}

export interface Settings {
  defaultUnblockDuration: number; // Default temporary unblock duration in minutes (default: 10)
}

/**
 * Gets all blocked domains from storage
 * @returns Promise resolving to array of blocked domains
 */
export async function getBlockedDomains(): Promise<BlockedDomain[]> {
  try {
    const storedData = await LocalStorage.getItem<string>(BLOCKED_DOMAINS_KEY);

    if (!storedData) {
      return [];
    }

    const parsed = JSON.parse(storedData);

    // Ensure it's an array and has proper structure
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => ({
      domain: item.domain || "",
      dateAdded: item.dateAdded || new Date().toISOString(),
      notes: item.notes || undefined,
      isEnabled: item.isEnabled !== undefined ? item.isEnabled : true, // Default to enabled for backwards compatibility
      categories: item.categories || [],
    }));
  } catch (error) {
    console.error("Error reading blocked domains from storage:", error);
    return [];
  }
}

/**
 * Saves blocked domains to storage
 * @param domains - Array of blocked domains to save
 */
export async function saveBlockedDomains(
  domains: BlockedDomain[],
): Promise<void> {
  try {
    const dataToStore = JSON.stringify(domains);
    await LocalStorage.setItem(BLOCKED_DOMAINS_KEY, dataToStore);
  } catch (error) {
    console.error("Error saving blocked domains to storage:", error);
    throw new Error("Failed to save blocked domains");
  }
}

/**
 * Adds a domain to the blocked list
 * @param domain - Domain to add
 * @param notes - Optional notes about the domain
 * @param isEnabled - Whether this domain should be enabled immediately (default: true)
 * @param categories - Optional categories for organization
 * @returns Promise resolving to success status
 */
export async function addBlockedDomain(
  domain: string,
  notes?: string,
  isEnabled: boolean = true,
  categories?: string[],
): Promise<boolean> {
  try {
    const existingDomains = await getBlockedDomains();

    // Check for duplicates (case-insensitive)
    const isDuplicate = existingDomains.some(
      (item) => item.domain.toLowerCase() === domain.toLowerCase(),
    );

    if (isDuplicate) {
      throw new Error("Domain already exists in blocked list");
    }

    const newDomain: BlockedDomain = {
      domain: domain.toLowerCase(),
      dateAdded: new Date().toISOString(),
      notes: notes?.trim() || undefined,
      isEnabled,
      categories: categories || [],
    };

    const updatedDomains = [...existingDomains, newDomain];
    await saveBlockedDomains(updatedDomains);

    return true;
  } catch (error) {
    console.error("Error adding blocked domain:", error);
    throw error;
  }
}

/**
 * Removes a domain from the blocked list
 * @param domain - Domain to remove
 * @returns Promise resolving to success status
 */
export async function removeBlockedDomain(domain: string): Promise<boolean> {
  try {
    const existingDomains = await getBlockedDomains();

    const updatedDomains = existingDomains.filter(
      (item) => item.domain.toLowerCase() !== domain.toLowerCase(),
    );

    // Check if any domain was actually removed
    if (updatedDomains.length === existingDomains.length) {
      return false; // Domain not found
    }

    await saveBlockedDomains(updatedDomains);
    return true;
  } catch (error) {
    console.error("Error removing blocked domain:", error);
    throw new Error("Failed to remove blocked domain");
  }
}

/**
 * Gets the current blocking status
 * @returns Promise resolving to blocking status
 */
export async function getBlockingStatus(): Promise<BlockingStatus> {
  try {
    const storedData = await LocalStorage.getItem<string>(BLOCKING_STATUS_KEY);

    if (!storedData) {
      return { isActive: false };
    }

    const parsed = JSON.parse(storedData);
    return {
      isActive: parsed.isActive || false,
      lastActivated: parsed.lastActivated,
      lastDeactivated: parsed.lastDeactivated,
    };
  } catch (error) {
    console.error("Error reading blocking status from storage:", error);
    return { isActive: false };
  }
}

/**
 * Updates the blocking status
 * @param isActive - Whether blocking is currently active
 */
export async function setBlockingStatus(isActive: boolean): Promise<void> {
  try {
    const currentStatus = await getBlockingStatus();
    const timestamp = new Date().toISOString();

    const newStatus: BlockingStatus = {
      ...currentStatus,
      isActive,
      ...(isActive
        ? { lastActivated: timestamp }
        : { lastDeactivated: timestamp }),
    };

    await LocalStorage.setItem(BLOCKING_STATUS_KEY, JSON.stringify(newStatus));
  } catch (error) {
    console.error("Error updating blocking status:", error);
    throw new Error("Failed to update blocking status");
  }
}

/**
 * Gets just the domain names as strings for easier processing
 * @returns Promise resolving to array of domain strings
 */
export async function getBlockedDomainList(): Promise<string[]> {
  const domains = await getBlockedDomains();
  return domains.map((item) => item.domain);
}

/**
 * Toggles the enabled status of a domain
 * @param domain - Domain to toggle
 * @returns Promise resolving to new enabled status
 */
export async function toggleDomainEnabled(domain: string): Promise<boolean> {
  try {
    const existingDomains = await getBlockedDomains();
    const domainIndex = existingDomains.findIndex(
      (item) => item.domain.toLowerCase() === domain.toLowerCase(),
    );

    if (domainIndex === -1) {
      throw new Error("Domain not found in blocked list");
    }

    existingDomains[domainIndex].isEnabled =
      !existingDomains[domainIndex].isEnabled;
    await saveBlockedDomains(existingDomains);

    return existingDomains[domainIndex].isEnabled;
  } catch (error) {
    console.error("Error toggling domain enabled status:", error);
    throw error;
  }
}

/**
 * Gets only the enabled domains
 * @returns Promise resolving to array of enabled domain strings
 */
export async function getEnabledDomains(): Promise<string[]> {
  const allDomains = await getBlockedDomains();
  return allDomains
    .filter((domain) => domain.isEnabled)
    .map((domain) => domain.domain);
}

/**
 * Clears all blocked domains (useful for reset functionality)
 */
export async function clearAllBlockedDomains(): Promise<void> {
  try {
    await LocalStorage.removeItem(BLOCKED_DOMAINS_KEY);
    await LocalStorage.removeItem(BLOCKING_STATUS_KEY);
  } catch (error) {
    console.error("Error clearing blocked domains:", error);
    throw new Error("Failed to clear blocked domains");
  }
}

// ============================================================================
// TEMPORARY UNBLOCK FUNCTIONS
// ============================================================================

/**
 * Gets the temporary unblock status
 */
export async function getTemporaryUnblock(): Promise<TemporaryUnblock> {
  try {
    const storedData = await LocalStorage.getItem<string>(
      TEMPORARY_UNBLOCK_KEY,
    );

    if (!storedData) {
      return { isActive: false };
    }

    const parsed = JSON.parse(storedData);

    // Check if unblock has expired
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      await clearTemporaryUnblock();
      return { isActive: false };
    }

    return {
      isActive: parsed.isActive || false,
      expiresAt: parsed.expiresAt,
      duration: parsed.duration,
    };
  } catch (error) {
    console.error("Error reading temporary unblock:", error);
    return { isActive: false };
  }
}

/**
 * Sets temporary unblock with duration
 * @param durationMinutes - Duration in minutes (default: 10)
 */
export async function setTemporaryUnblock(
  durationMinutes?: number,
): Promise<void> {
  try {
    const settings = await getSettings();
    const duration = durationMinutes || settings.defaultUnblockDuration;
    const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();

    const temporaryUnblock: TemporaryUnblock = {
      isActive: true,
      expiresAt,
      duration,
    };

    await LocalStorage.setItem(
      TEMPORARY_UNBLOCK_KEY,
      JSON.stringify(temporaryUnblock),
    );
  } catch (error) {
    console.error("Error setting temporary unblock:", error);
    throw new Error("Failed to set temporary unblock");
  }
}

/**
 * Clears temporary unblock
 */
export async function clearTemporaryUnblock(): Promise<void> {
  try {
    await LocalStorage.removeItem(TEMPORARY_UNBLOCK_KEY);
  } catch (error) {
    console.error("Error clearing temporary unblock:", error);
    throw new Error("Failed to clear temporary unblock");
  }
}

/**
 * Checks if temporary unblock is currently active
 */
export async function isTemporarilyUnblocked(): Promise<boolean> {
  const status = await getTemporaryUnblock();
  return status.isActive;
}

// ============================================================================
// CATEGORY FUNCTIONS
// ============================================================================

/**
 * Gets all categories
 */
export async function getCategories(): Promise<Category[]> {
  try {
    // Force clear old cached categories to load new defaults
    await LocalStorage.removeItem(CATEGORIES_KEY);
    const storedData = await LocalStorage.getItem<string>(CATEGORIES_KEY);

    if (!storedData) {
      // Return default categories (no emojis) - 25+ options
      return [
        { name: "Social Media" },
        { name: "Video Streaming" },
        { name: "News & Media" },
        { name: "Gaming" },
        { name: "Shopping" },
        { name: "Entertainment" },
        { name: "Sports" },
        { name: "Forums & Communities" },
        { name: "Dating" },
        { name: "Gambling" },
        { name: "Betting & Casinos" },
        { name: "Work Distractions" },
        { name: "Productivity Tools" },
        { name: "Email" },
        { name: "Messaging & Chat" },
        { name: "Music & Podcasts" },
        { name: "Streaming Services" },
        { name: "E-commerce" },
        { name: "Marketplaces" },
        { name: "Fashion & Beauty" },
        { name: "Food & Cooking" },
        { name: "Travel & Booking" },
        { name: "Finance & Banking" },
        { name: "Cryptocurrency" },
        { name: "Stock Trading" },
        { name: "Job Search" },
        { name: "Education" },
        { name: "Research" },
        { name: "Development Tools" },
        { name: "Design & Creative" },
        { name: "Photo & Video Editing" },
        { name: "Cloud Storage" },
        { name: "AI Tools" },
        { name: "Blogs & Personal Sites" },
        { name: "Memes & Humor" },
        { name: "Politics" },
        { name: "Health & Fitness" },
        { name: "Religion & Spirituality" },
        { name: "Other" },
      ];
    }

    return JSON.parse(storedData);
  } catch (error) {
    console.error("Error reading categories:", error);
    return [];
  }
}

/**
 * Saves categories
 */
export async function saveCategories(categories: Category[]): Promise<void> {
  try {
    await LocalStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  } catch (error) {
    console.error("Error saving categories:", error);
    throw new Error("Failed to save categories");
  }
}

/**
 * Adds a new category
 */
export async function addCategory(category: Category): Promise<void> {
  try {
    const categories = await getCategories();

    // Check for duplicates
    if (
      categories.some(
        (c) => c.name.toLowerCase() === category.name.toLowerCase(),
      )
    ) {
      throw new Error("Category already exists");
    }

    categories.push(category);
    await saveCategories(categories);
  } catch (error) {
    console.error("Error adding category:", error);
    throw error;
  }
}

/**
 * Gets domains by category
 */
export async function getDomainsByCategory(
  categoryName: string,
): Promise<BlockedDomain[]> {
  const domains = await getBlockedDomains();
  return domains.filter((d) => d.categories?.includes(categoryName));
}

// ============================================================================
// BULK ACTIONS
// ============================================================================

/**
 * Bulk delete domains
 */
export async function bulkDeleteDomains(domains: string[]): Promise<number> {
  try {
    const existingDomains = await getBlockedDomains();
    const domainsLower = domains.map((d) => d.toLowerCase());

    const updatedDomains = existingDomains.filter(
      (d) => !domainsLower.includes(d.domain.toLowerCase()),
    );

    const deletedCount = existingDomains.length - updatedDomains.length;
    await saveBlockedDomains(updatedDomains);

    return deletedCount;
  } catch (error) {
    console.error("Error bulk deleting domains:", error);
    throw new Error("Failed to bulk delete domains");
  }
}

/**
 * Bulk enable/disable domains
 */
export async function bulkToggleDomains(
  domains: string[],
  enabled: boolean,
): Promise<number> {
  try {
    const existingDomains = await getBlockedDomains();
    const domainsLower = domains.map((d) => d.toLowerCase());

    let updatedCount = 0;
    const updatedDomains = existingDomains.map((d) => {
      if (domainsLower.includes(d.domain.toLowerCase())) {
        updatedCount++;
        return { ...d, isEnabled: enabled };
      }
      return d;
    });

    await saveBlockedDomains(updatedDomains);
    return updatedCount;
  } catch (error) {
    console.error("Error bulk toggling domains:", error);
    throw new Error("Failed to bulk toggle domains");
  }
}

/**
 * Bulk assign categories to domains
 */
export async function bulkAssignCategories(
  domains: string[],
  categories: string[],
): Promise<number> {
  try {
    const existingDomains = await getBlockedDomains();
    const domainsLower = domains.map((d) => d.toLowerCase());

    let updatedCount = 0;
    const updatedDomains = existingDomains.map((d) => {
      if (domainsLower.includes(d.domain.toLowerCase())) {
        updatedCount++;
        const existingCategories = d.categories || [];
        const mergedCategories = Array.from(
          new Set([...existingCategories, ...categories]),
        );
        return { ...d, categories: mergedCategories };
      }
      return d;
    });

    await saveBlockedDomains(updatedDomains);
    return updatedCount;
  } catch (error) {
    console.error("Error bulk assigning categories:", error);
    throw new Error("Failed to bulk assign categories");
  }
}

// ============================================================================
// SETTINGS FUNCTIONS
// ============================================================================

/**
 * Gets settings
 */
export async function getSettings(): Promise<Settings> {
  try {
    const storedData = await LocalStorage.getItem<string>(SETTINGS_KEY);

    if (!storedData) {
      return { defaultUnblockDuration: 10 }; // Default 10 minutes
    }

    return JSON.parse(storedData);
  } catch (error) {
    console.error("Error reading settings:", error);
    return { defaultUnblockDuration: 10 };
  }
}

/**
 * Saves settings
 */
export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await LocalStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving settings:", error);
    throw new Error("Failed to save settings");
  }
}

// ============================================================================
// IMPORT/EXPORT FUNCTIONS
// ============================================================================

export interface ExportData {
  version: string;
  exportDate: string;
  domains: BlockedDomain[];
  categories: Category[];
  settings: Settings;
}

/**
 * Exports all data as JSON string
 */
export async function exportData(): Promise<string> {
  try {
    const domains = await getBlockedDomains();
    const categories = await getCategories();
    const settings = await getSettings();

    const exportData: ExportData = {
      version: "1.0.0",
      exportDate: new Date().toISOString(),
      domains,
      categories,
      settings,
    };

    return JSON.stringify(exportData, null, 2);
  } catch (error) {
    console.error("Error exporting data:", error);
    throw new Error("Failed to export data");
  }
}

/**
 * Imports data from JSON string
 * @param jsonData - JSON string containing export data
 * @param merge - If true, merge with existing data. If false, replace existing data
 */
export async function importData(
  jsonData: string,
  merge: boolean = false,
): Promise<void> {
  try {
    const importData: ExportData = JSON.parse(jsonData);

    // Validate structure
    if (!importData.domains || !Array.isArray(importData.domains)) {
      throw new Error("Invalid import data: missing or invalid domains");
    }

    if (merge) {
      // Merge with existing data
      const existingDomains = await getBlockedDomains();
      const existingDomainNames = existingDomains.map((d) =>
        d.domain.toLowerCase(),
      );

      // Only add domains that don't already exist
      const newDomains = importData.domains.filter(
        (d) => !existingDomainNames.includes(d.domain.toLowerCase()),
      );

      await saveBlockedDomains([...existingDomains, ...newDomains]);
    } else {
      // Replace existing data
      await saveBlockedDomains(importData.domains);
    }

    // Import categories if present
    if (importData.categories) {
      if (merge) {
        const existingCategories = await getCategories();
        const existingCategoryNames = existingCategories.map((c) =>
          c.name.toLowerCase(),
        );
        const newCategories = importData.categories.filter(
          (c) => !existingCategoryNames.includes(c.name.toLowerCase()),
        );
        await saveCategories([...existingCategories, ...newCategories]);
      } else {
        await saveCategories(importData.categories);
      }
    }

    // Import settings if present
    if (importData.settings) {
      await saveSettings(importData.settings);
    }
  } catch (error) {
    console.error("Error importing data:", error);
    throw new Error("Failed to import data: " + (error as Error).message);
  }
}
