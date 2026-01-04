/**
 * LocalStorage utilities with type safety
 */
import { LocalStorage } from "@raycast/api";
import { STORAGE_KEYS } from "../constants";
import { GENERATED_CATEGORY, ITEM_TYPES, type Category, type ItemType, type Kaomoji } from "../types";

/**
 * Custom art item (saved from generate command)
 */
export interface CustomArt {
  text: string;
  name: string;
  font: string;
  createdAt: number;
}

/**
 * Get stored filter type
 */
export async function getStoredType(): Promise<ItemType | "all"> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.selectedType);
    if (stored === "all" || ITEM_TYPES.includes(stored as ItemType)) {
      return stored as ItemType | "all";
    }
  } catch (error) {
    console.error("[storage] Failed to get stored type:", error);
  }
  return "all";
}

/**
 * Set stored filter type
 */
export async function setStoredType(type: ItemType | "all"): Promise<void> {
  try {
    await LocalStorage.setItem(STORAGE_KEYS.selectedType, type);
  } catch (error) {
    console.error("[storage] Failed to set stored type:", error);
  }
}

/**
 * Get stored filter category
 */
export async function getStoredCategory(validCategories: readonly string[]): Promise<Category | "all"> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.selectedCategory);
    if (stored === "all" || validCategories.includes(stored as Category)) {
      return stored as Category | "all";
    }
  } catch (error) {
    console.error("[storage] Failed to get stored category:", error);
  }
  return "all";
}

/**
 * Set stored filter category
 */
export async function setStoredCategory(category: Category | "all"): Promise<void> {
  try {
    await LocalStorage.setItem(STORAGE_KEYS.selectedCategory, category);
  } catch (error) {
    console.error("[storage] Failed to set stored category:", error);
  }
}

/**
 * Get stored favorites set
 */
export async function getStoredFavorites(): Promise<Set<string>> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.favorites);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
        return new Set(parsed as string[]);
      }
      console.warn("[storage] Invalid favorites format, resetting");
    }
  } catch (error) {
    console.error("[storage] Failed to get stored favorites:", error);
  }
  return new Set();
}

/**
 * Set stored favorites set
 */
export async function setStoredFavorites(favorites: Set<string>): Promise<void> {
  try {
    await LocalStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify([...favorites]));
  } catch (error) {
    console.error("[storage] Failed to set stored favorites:", error);
  }
}

/**
 * Get stored custom arts
 */
export async function getStoredCustomArts(): Promise<CustomArt[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.customArts);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed as CustomArt[];
      }
    }
  } catch (error) {
    console.error("[storage] Failed to get stored custom arts:", error);
  }
  return [];
}

/**
 * Add a custom art
 */
export async function addCustomArt(art: CustomArt): Promise<void> {
  try {
    const existing = await getStoredCustomArts();
    // Check if already exists (by text)
    if (existing.some((a) => a.text === art.text)) {
      return;
    }
    const updated = [art, ...existing];
    await LocalStorage.setItem(STORAGE_KEYS.customArts, JSON.stringify(updated));
  } catch (error) {
    console.error("[storage] Failed to add custom art:", error);
    throw error;
  }
}

/**
 * Remove a custom art
 */
export async function removeCustomArt(text: string): Promise<void> {
  try {
    const existing = await getStoredCustomArts();
    const updated = existing.filter((a) => a.text !== text);
    await LocalStorage.setItem(STORAGE_KEYS.customArts, JSON.stringify(updated));
  } catch (error) {
    console.error("[storage] Failed to remove custom art:", error);
    throw error;
  }
}

/**
 * Convert custom arts to Kaomoji format for display
 */
export function customArtsToKaomoji(customArts: CustomArt[]): Kaomoji[] {
  return customArts.map((art) => ({
    text: art.text,
    name: { ja: art.name, en: art.name },
    keywords: [art.font, "generated", "custom"],
    type: "aa" as const,
    category: GENERATED_CATEGORY,
  }));
}
