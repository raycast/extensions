import { LocalStorage } from "@raycast/api";

// Types
export interface TranslationHistoryItem {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  timestamp: number;
}

const HISTORY_STORAGE_KEY = "translation_history";
const MAX_HISTORY_ITEMS = 100;

/**
 * Generate a unique ID for a history item
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all translation history items
 * Returns items sorted by timestamp (newest first)
 */
export async function getHistory(): Promise<TranslationHistoryItem[]> {
  try {
    const stored = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const items: TranslationHistoryItem[] = JSON.parse(stored);
    return items.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to get history:", error);
    return [];
  }
}

/**
 * Save a new translation to history
 * Automatically limits to MAX_HISTORY_ITEMS
 */
export async function saveTranslation(
  originalText: string,
  translatedText: string,
  sourceLanguage: string,
  targetLanguage: string,
): Promise<TranslationHistoryItem> {
  const newItem: TranslationHistoryItem = {
    id: generateId(),
    originalText,
    translatedText,
    sourceLanguage,
    targetLanguage,
    timestamp: Date.now(),
  };

  try {
    const history = await getHistory();

    // Check for duplicate (same original text)
    const existingIndex = history.findIndex(
      (item) =>
        item.originalText === originalText &&
        item.targetLanguage === targetLanguage,
    );

    if (existingIndex !== -1) {
      // Update existing item instead of adding duplicate
      history[existingIndex] = newItem;
    } else {
      // Add new item at the beginning
      history.unshift(newItem);
    }

    // Limit to max items
    const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    await LocalStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(limitedHistory),
    );

    return newItem;
  } catch (error) {
    console.error("Failed to save translation:", error);
    throw error;
  }
}

/**
 * Delete a specific history item by ID
 */
export async function deleteHistoryItem(id: string): Promise<void> {
  try {
    const history = await getHistory();
    const filtered = history.filter((item) => item.id !== id);
    await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to delete history item:", error);
    throw error;
  }
}

/**
 * Clear all translation history
 */
export async function clearHistory(): Promise<void> {
  try {
    await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear history:", error);
    throw error;
  }
}

/**
 * Get the count of history items
 */
export async function getHistoryCount(): Promise<number> {
  const history = await getHistory();
  return history.length;
}

/**
 * Search history by text (searches both original and translated text)
 */
export async function searchHistory(
  query: string,
): Promise<TranslationHistoryItem[]> {
  const history = await getHistory();
  const lowerQuery = query.toLowerCase();
  return history.filter(
    (item) =>
      item.originalText.toLowerCase().includes(lowerQuery) ||
      item.translatedText.toLowerCase().includes(lowerQuery),
  );
}
