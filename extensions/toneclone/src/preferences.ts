import { LocalStorage } from "@raycast/api";
import { SavedPreferences } from "./types";

const PREFERENCES_KEY = "toneclone-preferences";

export async function getSavedPreferences(suppressLogging = false): Promise<SavedPreferences> {
  try {
    const stored = await LocalStorage.getItem<string>(PREFERENCES_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Validate that the parsed result is an object and not an array or primitive
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed;
        } else {
          if (!suppressLogging) {
            console.warn("Failed to load saved preferences:", new Error("Invalid preferences format"));
          }
          return {};
        }
      } catch (parseError) {
        if (!suppressLogging) {
          console.warn("Failed to load saved preferences:", parseError);
        }
        return {};
      }
    }
  } catch (error) {
    if (!suppressLogging) {
      console.warn("Failed to load saved preferences:", error);
    }
    return {};
  }
  return {};
}

export async function saveLastPersona(command: string, personaId: string): Promise<void> {
  try {
    const prefs = await getSavedPreferences();
    const updatedPrefs = {
      ...prefs,
      [`${command}PersonaId`]: personaId,
    };
    await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch {
    // If getSavedPreferences fails, still attempt to save with just the new value
    try {
      const updatedPrefs = {
        [`${command}PersonaId`]: personaId,
      };
      await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));
    } catch (saveError) {
      console.warn("Failed to save persona preference:", saveError);
    }
  }
}

// Internal function that throws errors for calling functions to handle
async function getSavedPreferencesWithErrors(): Promise<SavedPreferences> {
  const stored = await LocalStorage.getItem<string>(PREFERENCES_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Validate that the parsed result is an object and not an array or primitive
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      } else {
        return {};
      }
    } catch {
      return {};
    }
  }
  return {};
}

export async function getLastPersona(command: string): Promise<string | undefined> {
  try {
    const prefs = await getSavedPreferencesWithErrors();
    const key = `${command}PersonaId`;
    const value = prefs[key];
    return typeof value === "string" ? value : undefined;
  } catch (error) {
    console.warn("Failed to get last persona:", error);
    return undefined;
  }
}

// Save per-application persona preference
export async function saveAppPersona(command: string, appName: string, personaId: string): Promise<void> {
  try {
    const prefs = await getSavedPreferences();
    const updatedPrefs = {
      ...prefs,
      [`${command}_${appName}_personaId`]: personaId,
    };
    await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.warn("Failed to save app persona preference:", error);
  }
}

// Get per-application persona preference
export async function getAppPersona(command: string, appName: string): Promise<string | undefined> {
  try {
    const prefs = await getSavedPreferences();
    const key = `${command}_${appName}_personaId`;
    const value = prefs[key];
    return typeof value === "string" ? value : undefined;
  } catch (error) {
    console.warn("Failed to get app persona:", error);
    return undefined;
  }
}

// Helper function to extract domain from URL
function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return url; // Fallback if URL parsing fails
  }
}

// Save per-domain persona preference
export async function saveDomainPersona(command: string, url: string, personaId: string): Promise<void> {
  try {
    const domain = extractDomain(url);
    const prefs = await getSavedPreferences();
    const updatedPrefs = {
      ...prefs,
      [`${command}_${domain}_personaId`]: personaId,
    };
    await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.warn("Failed to save domain persona preference:", error);
  }
}

// Get per-domain persona preference
export async function getDomainPersona(command: string, url: string): Promise<string | undefined> {
  try {
    const domain = extractDomain(url);
    const prefs = await getSavedPreferences();
    const key = `${command}_${domain}_personaId`;
    const value = prefs[key];
    return typeof value === "string" ? value : undefined;
  } catch (error) {
    console.warn("Failed to get domain persona:", error);
    return undefined;
  }
}

export async function saveLastKnowledgeCards(knowledgeCardIds: string[]): Promise<void> {
  try {
    const prefs = await getSavedPreferences();
    const updatedPrefs = {
      ...prefs,
      lastKnowledgeCardIds: knowledgeCardIds,
    };
    await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.warn("Failed to save knowledge preferences:", error);
  }
}

export async function getLastKnowledgeCards(): Promise<string[]> {
  try {
    const prefs = await getSavedPreferencesWithErrors();
    const knowledgeCards = prefs.lastKnowledgeCardIds;
    return Array.isArray(knowledgeCards) ? knowledgeCards : [];
  } catch (error) {
    console.warn("Failed to get last knowledge:", error);
    return [];
  }
}

export async function saveLastInputType(inputType: "text" | "file"): Promise<void> {
  try {
    const prefs = await getSavedPreferences();
    const updatedPrefs = {
      ...prefs,
      lastInputType: inputType,
    };
    await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.warn("Failed to save input type preference:", error);
  }
}

export async function getLastInputType(): Promise<"text" | "file" | undefined> {
  try {
    const prefs = await getSavedPreferencesWithErrors();
    const inputType = prefs.lastInputType;
    return inputType === "text" || inputType === "file" ? inputType : undefined;
  } catch (error) {
    console.warn("Failed to get last input type:", error);
    return undefined;
  }
}

// Save per-persona knowledge card preferences
export async function savePersonaKnowledgeCards(personaId: string, knowledgeCardIds: string[]): Promise<void> {
  try {
    const prefs = await getSavedPreferences();
    const updatedPrefs = {
      ...prefs,
      [`persona_${personaId}_knowledgeCards`]: knowledgeCardIds,
    };
    await LocalStorage.setItem(PREFERENCES_KEY, JSON.stringify(updatedPrefs));
  } catch (error) {
    console.warn("Failed to save persona knowledge preferences:", error);
  }
}

// Get per-persona knowledge card preferences, defaulting to all knowledge if none saved
export async function getPersonaKnowledgeCards(personaId: string, allKnowledgeCards: string[]): Promise<string[]> {
  try {
    const prefs = await getSavedPreferences();
    const key = `persona_${personaId}_knowledgeCards`;
    const saved = prefs[key];

    if (Array.isArray(saved)) {
      // Return saved preferences, filtered to only include knowledge cards that still exist
      return saved.filter((id) => allKnowledgeCards.includes(id));
    } else {
      // Default to all knowledge cards being selected
      return allKnowledgeCards;
    }
  } catch (error) {
    console.warn("Failed to get persona knowledge:", error);
    return allKnowledgeCards; // Default to all knowledge cards
  }
}

export async function clearPreferences(): Promise<void> {
  try {
    await LocalStorage.removeItem(PREFERENCES_KEY);
  } catch (error) {
    console.warn("Failed to clear preferences:", error);
  }
}
