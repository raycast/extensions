import { SearchResult } from "../types";
import { WeChatManager } from "../utils/wechatManager";
import { contactService } from "./contactService";

// Cache mechanism for contact data
let contactsCache: SearchResult[] | null = null;
let lastLoadTime: number = 0;
const CACHE_VALIDITY_PERIOD = 5 * 60 * 1000; // 5 minutes cache validity

/**
 * Loads all WeChat contacts with proper environment checks
 * @param forceRefresh Force refresh the contacts cache
 * @returns Array of contact search results
 */
export async function loadContacts(forceRefresh = false): Promise<SearchResult[]> {
  // Use cache if valid and not forcing refresh
  const now = Date.now();
  if (!forceRefresh && contactsCache && now - lastLoadTime < CACHE_VALIDITY_PERIOD) {
    console.log(`[ContactLoader] Using cached contacts (${contactsCache.length} items)`);
    return contactsCache;
  }

  try {
    console.log("[ContactLoader] Checking WeChat Environment...");

    // Environment checks
    if (!WeChatManager.isWeChatInstalled()) {
      throw new Error("WeChat is not installed.");
    }
    if (!WeChatManager.isWeChatRunning()) {
      throw new Error("WeChat is not running.");
    }
    if (!WeChatManager.isWeChatTweakInstalled()) {
      throw new Error("WeChatTweak is not installed.");
    }

    const isServiceRunning = await WeChatManager.isWeChatServiceRunning();
    if (!isServiceRunning) {
      throw new Error("WeChat service is not running.");
    }

    console.log("[ContactLoader] WeChat environment is ready, starting to load contact data...");

    // Create AbortController for proper lifecycle management
    const controller = new AbortController();
    try {
      // Pass the signal to the search method
      const contacts = await contactService.searchContacts("", controller.signal);

      if (!contacts || contacts.length === 0) {
        throw new Error("The address book is empty. Please check the WeChat service or login status.");
      }

      // Update cache
      contactsCache = contacts;
      lastLoadTime = now;

      console.log(`[ContactLoader] Successfully Loaded ${contacts.length} Contact data.`);
      return contacts;
    } finally {
      // Always abort the controller when done to clean up resources
      controller.abort();
    }
  } catch (error) {
    console.error("[ContactLoader] Error:", error);
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Clears the contacts cache
 */
export function clearContactsCache(): void {
  contactsCache = null;
  lastLoadTime = 0;
  console.log("[ContactLoader] Contacts cache cleared");
}

/**
 * Search contacts by name or nickname
 * @param keyword Search keyword
 * @returns Filtered contacts
 */
export async function searchContactsByName(keyword: string): Promise<SearchResult[]> {
  const contacts = await loadContacts();
  const lowerKeyword = keyword.toLowerCase();

  return contacts.filter((contact) => {
    if (!contact || !contact.title || !contact.subtitle) return false;

    return (
      (typeof contact.title === "string" && contact.title.toLowerCase().includes(lowerKeyword)) ||
      (typeof contact.subtitle === "string" && contact.subtitle.toLowerCase().includes(lowerKeyword)) ||
      (typeof contact.arg === "string" && contact.arg.toLowerCase().includes(lowerKeyword))
    );
  });
}

/**
 * Search contacts by surname
 * @param surname Surname to search for
 * @returns Filtered contacts
 */
export async function searchContactsBySurname(surname: string): Promise<SearchResult[]> {
  const contacts = await loadContacts();

  return contacts.filter((contact) => {
    if (!contact || !contact.title) return false;
    return typeof contact.title === "string" && contact.title.startsWith(surname);
  });
}

/**
 * Search contacts by name length (number of Chinese characters)
 * @param length Number of Chinese characters in name
 * @returns Filtered contacts
 */
export async function searchContactsByLength(length: number): Promise<SearchResult[]> {
  const contacts = await loadContacts();

  return contacts.filter((contact) => {
    if (!contact || !contact.title) return false;

    // Remove non-Chinese characters and calculate length
    const chineseName = contact.title.replace(/[^\u4e00-\u9fa5]/g, "");
    return chineseName.length === length;
  });
}

/**
 * Get a single contact by WeChat ID
 * @param contactId WeChat ID
 * @returns Contact details or null if not found
 */
export async function getContactById(contactId: string): Promise<SearchResult | null> {
  const contacts = await loadContacts();
  return contacts.find((contact) => contact.arg === contactId) || null;
}
