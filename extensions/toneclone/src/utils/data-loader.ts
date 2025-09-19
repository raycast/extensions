import { getFrontmostApplication } from "@raycast/api";
import { api } from "../api";
import { Persona, KnowledgeCard, QueryPreset } from "../types";
import { getLastPersona, getAppPersona, getDomainPersona, getPersonaKnowledgeCards } from "../preferences";

export interface LoadDataResult {
  personas: Persona[];
  presets: QueryPreset[];
  frontmostApp?: { name: string };
  selectedPersonaId?: string;
  knowledgeCards: KnowledgeCard[];
  defaultKnowledgeCards: string[];
}

/**
 * Load initial data for generation forms with optimized parallel API calls
 */
export async function loadInitialData(options: {
  command: string;
  url?: string;
  loadKnowledgeCards?: boolean;
}): Promise<LoadDataResult> {
  const { command, url, loadKnowledgeCards = true } = options;

  // Load user personas (required)
  const personasData = await api.getPersonas();

  // Load built-in personas (optional - continue if fails)
  let builtInPersonasData: Persona[] = [];
  try {
    builtInPersonasData = await api.getBuiltInPersonas();
  } catch (error) {
    console.warn("Failed to load built-in personas, continuing with user personas only:", error);
  }

  // Load remaining data in parallel
  const [presetsData, frontmostApp] = await Promise.all([
    api.getQueryPresets("raycast://extensions/jfox/toneclone/generate-text"),
    getFrontmostApplication().catch((error) => {
      console.warn("Could not get frontmost application:", error);
      return undefined;
    }),
  ]);

  // Mark built-in personas and combine lists (user personas first)
  const markedBuiltInPersonas = builtInPersonasData.map((persona) => ({
    ...persona,
    isBuiltIn: true,
  }));
  const allPersonas = [...personasData, ...markedBuiltInPersonas];

  // Determine selected persona using preference hierarchy
  let selectedPersonaId: string | undefined;

  if (allPersonas.length > 0) {
    // Try domain-specific persona first (for browser commands)
    if (url) {
      selectedPersonaId = await getDomainPersona(command, url);
    }

    // Fall back to app-specific persona
    if (!selectedPersonaId && frontmostApp?.name) {
      selectedPersonaId = await getAppPersona(command, frontmostApp.name);
    }

    // Fall back to last used persona for this command
    if (!selectedPersonaId) {
      selectedPersonaId = await getLastPersona(command);
    }

    // Final fallback to first user persona (not built-in)
    if (!selectedPersonaId) {
      selectedPersonaId = personasData.length > 0 ? personasData[0].personaId : allPersonas[0].personaId;
    }
  }

  // Load knowledge cards for selected persona (skip for built-in personas)
  let knowledgeCards: KnowledgeCard[] = [];
  let defaultKnowledgeCards: string[] = [];

  if (loadKnowledgeCards && selectedPersonaId) {
    // Check if the selected persona is built-in
    const selectedPersona = allPersonas.find((p) => p.personaId === selectedPersonaId);
    if (!selectedPersona?.isBuiltIn) {
      try {
        knowledgeCards = await api.getPersonaKnowledgeCards(selectedPersonaId);

        if (knowledgeCards.length > 0) {
          const allKnowledgeCardIds = knowledgeCards.map((kc) => kc.knowledgeCardId);
          defaultKnowledgeCards = await getPersonaKnowledgeCards(selectedPersonaId, allKnowledgeCardIds);
        }
      } catch (error) {
        console.error("Failed to load persona knowledge:", error);
        // Continue with empty knowledge cards
      }
    }
  }

  return {
    personas: allPersonas,
    presets: presetsData,
    frontmostApp,
    selectedPersonaId,
    knowledgeCards,
    defaultKnowledgeCards,
  };
}

/**
 * Load knowledge for a specific persona (used when persona changes)
 */
export async function loadPersonaKnowledgeCards(
  personaId: string,
  allPersonas?: Persona[],
): Promise<{
  knowledgeCards: KnowledgeCard[];
  defaultKnowledgeCards: string[];
}> {
  try {
    // Check if this is a built-in persona
    if (allPersonas) {
      const persona = allPersonas.find((p) => p.personaId === personaId);
      if (persona?.isBuiltIn) {
        // Built-in personas don't have knowledge cards
        return { knowledgeCards: [], defaultKnowledgeCards: [] };
      }
    }

    const knowledgeCards = await api.getPersonaKnowledgeCards(personaId);

    if (knowledgeCards.length > 0) {
      const allKnowledgeCardIds = knowledgeCards.map((kc) => kc.knowledgeCardId);
      const defaultKnowledgeCards = await getPersonaKnowledgeCards(personaId, allKnowledgeCardIds);
      return { knowledgeCards, defaultKnowledgeCards };
    }

    return { knowledgeCards: [], defaultKnowledgeCards: [] };
  } catch (error) {
    console.error("Failed to load persona knowledge:", error);
    return { knowledgeCards: [], defaultKnowledgeCards: [] };
  }
}
