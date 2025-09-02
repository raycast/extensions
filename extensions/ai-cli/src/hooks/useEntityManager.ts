import { useLocalStorage } from "@raycast/utils";
import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo } from "react";
import { BaseCustomEntity, CustomEntityInput, CustomEntityUpdate } from "../types";
import {
  createEntityWithMetadata,
  findEntityById,
  initializeBuiltInEntities,
  mergeWithBuiltInEntities,
  removeEntityFromList,
  updateEntityInList,
} from "@/utils/entity-operations";

export interface UseEntityManagerConfig<T> {
  storageKey: string;
  builtInEntities?: T[];
  createEntityId?: () => string;
}

interface UseEntityManagerReturn<T extends BaseCustomEntity> {
  entities: T[];
  allEntities: T[];
  isLoading: boolean;
  addEntity: (entityData: CustomEntityInput<T>) => Promise<T>;
  updateEntity: (id: string, updates: CustomEntityUpdate<T>) => Promise<T | undefined>;
  deleteEntity: (id: string) => Promise<void>;
  getEntityById: (id: string) => T | undefined;
  refreshEntities: () => void;
}

/**
 * Generic entity manager for type-safe CRUD operations with localStorage persistence.
 * Provides unified pattern for managing custom entities with automatic synchronization.
 */
export function useEntityManager<T extends BaseCustomEntity>(
  config: UseEntityManagerConfig<T>
): UseEntityManagerReturn<T> {
  const { storageKey, builtInEntities = [], createEntityId } = config;

  const { value: entities = [], setValue: setEntities, isLoading } = useLocalStorage<T[]>(storageKey, []);

  // Bootstrap with built-in entities if storage is empty
  useEffect(() => {
    if (!isLoading && (entities?.length || 0) === 0 && builtInEntities.length > 0) {
      const initialEntities = initializeBuiltInEntities(builtInEntities);
      void setEntities(initialEntities);
    }
  }, [isLoading, entities?.length, builtInEntities, setEntities]);

  // Include built-in entities in allEntities for use in dropdowns, filtering out duplicates
  const allEntities = useMemo(() => {
    return mergeWithBuiltInEntities(entities || [], builtInEntities);
  }, [entities, builtInEntities]);

  const addEntity = useCallback(
    async (entityData: CustomEntityInput<T>): Promise<T> => {
      const newEntity = createEntityWithMetadata(entityData, createEntityId);
      await setEntities([...(entities || []), newEntity]);
      return newEntity;
    },
    [entities, setEntities, createEntityId]
  );

  const updateEntity = useCallback(
    async (id: string, updates: CustomEntityUpdate<T>): Promise<T | undefined> => {
      const updatedEntities = updateEntityInList(entities || [], id, updates);
      await setEntities(updatedEntities);
      return findEntityById(updatedEntities, id);
    },
    [entities, setEntities]
  );

  const deleteEntity = useCallback(
    async (id: string) => {
      const filteredEntities = removeEntityFromList(entities || [], id);
      await setEntities(filteredEntities);
    },
    [entities, setEntities]
  );

  const getEntityById = useCallback(
    (id: string): T | undefined => {
      return findEntityById(allEntities, id);
    },
    [allEntities]
  );

  const refreshEntities = useCallback(() => {
    (async () => {
      try {
        const raw = await LocalStorage.getItem(storageKey);
        const parsed = typeof raw === "string" ? (JSON.parse(raw) as T[]) : (raw as unknown as T[] | null);
        if (parsed && Array.isArray(parsed)) {
          await setEntities(parsed);
        } else {
          // If data is corrupted or missing, reset to empty array
          await setEntities([]);
        }
      } catch {
        // If parsing fails, reset to empty array
        await setEntities([]);
      }
    })();
  }, [setEntities, storageKey]);

  return {
    entities: entities || [],
    allEntities,
    isLoading,
    addEntity,
    updateEntity,
    deleteEntity,
    getEntityById,
    refreshEntities,
  };
}
