import { LocalStorage } from "@raycast/api";
import { ProxyGroup } from "./types";

/**
 * Proxy group selection memory data structure
 */
export interface ProxyGroupMemory {
  lastSelectedGroup: string; // Last selected proxy group name
  lastSelectedTime: number; // Last selection timestamp
  selectionHistory: Array<{
    // Selection history (keep up to 10 records)
    groupName: string;
    timestamp: number;
  }>;
  version: number; // Data version for future upgrades
}

/**
 * Proxy group memory manager
 */
export class ProxyGroupMemoryManager {
  private static readonly STORAGE_KEY = "clash-proxy-group-memory";
  private static readonly MAX_HISTORY_SIZE = 10;
  private static readonly DATA_VERSION = 1;

  private memoryCache: ProxyGroupMemory | null = null;
  private cacheTime = 0;
  private readonly CACHE_TTL = 5000; // Cache for 5 seconds

  /**
   * Get memory data
   */
  private async getMemoryData(): Promise<ProxyGroupMemory> {
    // Use cache to avoid frequent storage reads
    const now = Date.now();
    if (this.memoryCache && now - this.cacheTime < this.CACHE_TTL) {
      return this.memoryCache;
    }

    try {
      const data = await LocalStorage.getItem<string>(
        ProxyGroupMemoryManager.STORAGE_KEY,
      );

      if (data) {
        const parsed = JSON.parse(data) as ProxyGroupMemory;

        // Check data version compatibility
        if (parsed.version === ProxyGroupMemoryManager.DATA_VERSION) {
          this.memoryCache = parsed;
          this.cacheTime = now;
          return parsed;
        } else {
          console.log(
            "Proxy group memory data version incompatible, reinitializing",
          );
          await this.clearMemory();
        }
      }
    } catch (error) {
      console.error("Failed to read proxy group memory data:", error);
      // Clear and reinitialize when data is corrupted
      await this.clearMemory();
    }

    // Return default data
    const defaultData: ProxyGroupMemory = {
      lastSelectedGroup: "",
      lastSelectedTime: 0,
      selectionHistory: [],
      version: ProxyGroupMemoryManager.DATA_VERSION,
    };

    this.memoryCache = defaultData;
    this.cacheTime = now;
    return defaultData;
  }

  /**
   * Save memory data
   */
  private async saveMemoryData(data: ProxyGroupMemory): Promise<void> {
    try {
      await LocalStorage.setItem(
        ProxyGroupMemoryManager.STORAGE_KEY,
        JSON.stringify(data),
      );

      // Update cache
      this.memoryCache = data;
      this.cacheTime = Date.now();

      console.log("Proxy group memory data saved:", data.lastSelectedGroup);
    } catch (error) {
      console.error("Failed to save proxy group memory data:", error);
      // Save failure doesn't affect normal functionality, just log the error
    }
  }

  /**
   * Save user selected proxy group
   */
  async saveSelection(groupName: string): Promise<void> {
    if (!groupName || typeof groupName !== "string" || !groupName.trim()) {
      console.warn("Invalid proxy group name:", groupName);
      return;
    }

    try {
      const memory = await this.getMemoryData();
      const now = Date.now();

      // Update last selected proxy group
      memory.lastSelectedGroup = groupName;
      memory.lastSelectedTime = now;

      // Update selection history
      // Remove same history record
      memory.selectionHistory = memory.selectionHistory.filter(
        (item) => item.groupName !== groupName,
      );

      // Add new record to the beginning
      memory.selectionHistory.unshift({
        groupName,
        timestamp: now,
      });

      // Limit history record count
      if (
        memory.selectionHistory.length >
        ProxyGroupMemoryManager.MAX_HISTORY_SIZE
      ) {
        memory.selectionHistory = memory.selectionHistory.slice(
          0,
          ProxyGroupMemoryManager.MAX_HISTORY_SIZE,
        );
      }

      await this.saveMemoryData(memory);
    } catch (error) {
      console.error("Failed to save proxy group selection:", error);
    }
  }

  /**
   * Get last selected proxy group
   */
  async getLastSelectedGroup(): Promise<string | null> {
    try {
      const memory = await this.getMemoryData();
      return memory.lastSelectedGroup || null;
    } catch (error) {
      console.error("Failed to get last selected proxy group:", error);
      return null;
    }
  }

  /**
   * Get selection history
   */
  async getSelectionHistory(): Promise<
    Array<{ groupName: string; timestamp: number }>
  > {
    try {
      const memory = await this.getMemoryData();
      return memory.selectionHistory || [];
    } catch (error) {
      console.error("Failed to get selection history:", error);
      return [];
    }
  }

  /**
   * Sort proxy groups based on memory
   * Put last selected proxy group first, keep others in original order
   */
  async getSortedGroups<T extends ProxyGroup>(groups: T[]): Promise<T[]> {
    if (!groups || groups.length === 0) {
      return groups;
    }

    try {
      const lastSelected = await this.getLastSelectedGroup();

      if (!lastSelected) {
        return groups;
      }

      // Find last selected proxy group
      const lastSelectedGroup = groups.find((g) => g.name === lastSelected);

      if (!lastSelectedGroup) {
        // If last selected proxy group no longer exists, clear memory
        console.log(
          "Last selected proxy group no longer exists, clearing memory:",
          lastSelected,
        );
        await this.clearMemory();
        return groups;
      }

      // Put last selected proxy group first
      const otherGroups = groups.filter((g) => g.name !== lastSelected);
      return [lastSelectedGroup, ...otherGroups];
    } catch (error) {
      console.error("Failed to sort proxy groups:", error);
      return groups;
    }
  }

  /**
   * Clear all memory data
   */
  async clearMemory(): Promise<void> {
    try {
      await LocalStorage.removeItem(ProxyGroupMemoryManager.STORAGE_KEY);
      this.memoryCache = null;
      this.cacheTime = 0;
      console.log("Proxy group memory data cleared");
    } catch (error) {
      console.error("Failed to clear proxy group memory data:", error);
    }
  }

  /**
   * Get memory statistics
   */
  async getMemoryStats(): Promise<{
    hasMemory: boolean;
    lastSelectedGroup: string | null;
    lastSelectedTime: number;
    historyCount: number;
  }> {
    try {
      const memory = await this.getMemoryData();
      return {
        hasMemory: !!memory.lastSelectedGroup,
        lastSelectedGroup: memory.lastSelectedGroup || null,
        lastSelectedTime: memory.lastSelectedTime,
        historyCount: memory.selectionHistory.length,
      };
    } catch (error) {
      console.error("Failed to get memory statistics:", error);
      return {
        hasMemory: false,
        lastSelectedGroup: null,
        lastSelectedTime: 0,
        historyCount: 0,
      };
    }
  }
}

// Singleton instance
let memoryManagerInstance: ProxyGroupMemoryManager | null = null;

/**
 * Get proxy group memory manager instance
 */
export function getProxyGroupMemoryManager(): ProxyGroupMemoryManager {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new ProxyGroupMemoryManager();
  }
  return memoryManagerInstance;
}

/**
 * Reset memory manager instance (for testing or reinitialization)
 */
export function resetProxyGroupMemoryManager(): void {
  memoryManagerInstance = null;
}
