import { useCallback, useMemo } from "react";
import { BaseCustomEntity, CustomEntityInput, CustomEntityUpdate, ToneConfig } from "../types";
import { messages } from "@/locale/en/messages";
import { TONE_TYPES } from "@/constants";
import { useEntityManager } from "./useEntityManager";

export interface CustomTone extends ToneConfig, BaseCustomEntity {}

// Default tone - exists only in memory, never persisted
const DEFAULT_TONE: CustomTone = {
  id: TONE_TYPES.DEFAULT,
  name: messages.toneDescriptions.default.name,
  guidelines: messages.toneDescriptions.default.guidelines,
  icon: undefined,
  isBuiltIn: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Built-in tones for initial bootstrap
const BUILT_IN_TONES: CustomTone[] = [
  {
    id: TONE_TYPES.PROFESSIONAL,
    name: messages.toneDescriptions.professional.name,
    guidelines: messages.toneDescriptions.professional.guidelines,
    icon: undefined,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: TONE_TYPES.CONVERSATIONAL,
    name: messages.toneDescriptions.conversational.name,
    guidelines: messages.toneDescriptions.conversational.guidelines,
    icon: undefined,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: TONE_TYPES.TECHNICAL,
    name: messages.toneDescriptions.technical.name,
    guidelines: messages.toneDescriptions.technical.guidelines,
    icon: undefined,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: TONE_TYPES.EDUCATIONAL,
    name: messages.toneDescriptions.educational.name,
    guidelines: messages.toneDescriptions.educational.guidelines,
    icon: undefined,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: TONE_TYPES.CONCISE,
    name: messages.toneDescriptions.concise.name,
    guidelines: messages.toneDescriptions.concise.guidelines,
    icon: undefined,
    isBuiltIn: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

interface UseCustomTonesReturn {
  tones: CustomTone[];
  allTones: CustomTone[];
  isLoading: boolean;
  addTone: (tone: CustomEntityInput<CustomTone>) => Promise<CustomTone>;
  updateTone: (id: string, updates: CustomEntityUpdate<CustomTone>) => Promise<CustomTone | undefined>;
  deleteTone: (id: string) => Promise<void>;
  getToneById: (id: string) => CustomTone | undefined;
  refreshTones: () => void;
}

/**
 * Manages custom tone configurations with CRUD operations and localStorage persistence.
 */
export function useCustomTones(): UseCustomTonesReturn {
  // Memoize entity manager configuration for performance
  const entityManagerConfig = useMemo(
    () => ({
      storageKey: "tones",
      builtInEntities: BUILT_IN_TONES,
      createEntityId: () => `tone-${Date.now()}`,
    }),
    []
  );

  const entityManager = useEntityManager<CustomTone>(entityManagerConfig);

  // Include default tone at position 0 and filter duplicates
  // This ensures the default tone is always first and prevents duplication
  // if it's accidentally included in the entity manager's built-in entities
  const allTones = useMemo(
    () => [DEFAULT_TONE, ...entityManager.allEntities.filter((tone) => tone.id !== TONE_TYPES.DEFAULT)],
    [entityManager.allEntities]
  );

  const getToneById = useCallback(
    (id: string): CustomTone | undefined => {
      if (id === TONE_TYPES.DEFAULT) {
        return DEFAULT_TONE;
      }
      return entityManager.getEntityById(id);
    },
    [entityManager.getEntityById]
  );

  return {
    tones: entityManager.entities,
    allTones,
    isLoading: entityManager.isLoading,
    addTone: entityManager.addEntity,
    updateTone: entityManager.updateEntity,
    deleteTone: entityManager.deleteEntity,
    getToneById,
    refreshTones: entityManager.refreshEntities,
  };
}
