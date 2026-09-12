import { LocalStorage } from "@raycast/api";
import { SearchResult } from "../types";

// Storage keys
const RECENT_CONTACTS_KEY = "wechat_recent_contacts";
const PINNED_CONTACTS_KEY = "wechat_pinned_contacts";
const MAX_RECENT_CONTACTS = 10;

/**
 * Service for handling local storage operations
 */
class StorageService {
  /**
   * Add a contact to recent contacts
   * @param contact - Contact to add
   */
  async addRecentContact(contact: SearchResult): Promise<void> {
    try {
      // Get existing recent contacts
      const recentContacts = await this.getRecentContacts();

      // Remove if already exists
      const filteredContacts = recentContacts.filter((c) => c.arg !== contact.arg);

      // Add to beginning
      filteredContacts.unshift(contact);

      // Limit to max recent contacts
      const limitedContacts = filteredContacts.slice(0, MAX_RECENT_CONTACTS);

      // Save back to storage
      await LocalStorage.setItem(RECENT_CONTACTS_KEY, JSON.stringify(limitedContacts));
    } catch (error) {
      console.error("Failed to save recent contact:", error);
    }
  }

  /**
   * Get recent contacts
   * @returns List of recent contacts
   */
  async getRecentContacts(): Promise<SearchResult[]> {
    try {
      const recentContactsJson = await LocalStorage.getItem(RECENT_CONTACTS_KEY);
      if (!recentContactsJson) return [];
      return JSON.parse(recentContactsJson as string) as SearchResult[];
    } catch (error) {
      console.error("Failed to get recent contacts:", error);
      return [];
    }
  }

  /**
   * Clear recent contacts
   * @returns Success status
   */
  async clearRecentContacts(): Promise<boolean> {
    try {
      await LocalStorage.removeItem(RECENT_CONTACTS_KEY);
      return true;
    } catch (error) {
      console.error("Failed to clear recent contacts:", error);
      return false;
    }
  }

  /**
   * Get pinned contacts
   * @returns List of pinned contacts
   */
  async getPinnedContacts(): Promise<SearchResult[]> {
    try {
      const pinnedContactsJson = await LocalStorage.getItem(PINNED_CONTACTS_KEY);
      if (!pinnedContactsJson) return [];
      return JSON.parse(pinnedContactsJson as string) as SearchResult[];
    } catch (error) {
      console.error("Failed to parse pinned contacts:", error);
      return [];
    }
  }

  /**
   * Set pinned contacts
   * @param contacts - Contacts to pin
   */
  async setPinnedContacts(contacts: SearchResult[]): Promise<void> {
    try {
      await LocalStorage.setItem(PINNED_CONTACTS_KEY, JSON.stringify(contacts));
    } catch (error) {
      console.error("Failed to save pinned contacts:", error);
    }
  }
}

export const storageService = new StorageService();
