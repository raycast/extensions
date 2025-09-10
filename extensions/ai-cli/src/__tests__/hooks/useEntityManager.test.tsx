import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEntityManager, UseEntityManagerConfig } from "@/hooks/useEntityManager";
import { BaseCustomEntity, CustomEntityInput } from "@/types";
import { useLocalStorage } from "@raycast/utils";

const mockSetValue = vi.fn();

interface TestEntity extends BaseCustomEntity {
  name: string;
  value: number;
}

const BUILT_IN_TEST_ENTITIES: TestEntity[] = [
  {
    id: "builtin-1",
    name: "Built-in Entity 1",
    value: 100,
    isBuiltIn: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
];

describe("useEntityManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T12:00:00.000Z"));
    vi.mocked(useLocalStorage).mockReturnValue({
      value: [],
      setValue: mockSetValue,
      removeValue: vi.fn(),
      isLoading: false,
    });
  });

  const defaultConfig: UseEntityManagerConfig<TestEntity> = {
    storageKey: "test-entities",
    builtInEntities: BUILT_IN_TEST_ENTITIES,
    createEntityId: () => `test-${Date.now()}`,
  };

  describe("Entity Lifecycle Management", () => {
    it("loads entities from storage on initialization", () => {
      const storedEntities: TestEntity[] = [
        {
          id: "stored-1",
          name: "Stored Entity",
          value: 300,
          isBuiltIn: false,
          createdAt: "2024-01-10T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z",
        },
      ];

      vi.mocked(useLocalStorage).mockReturnValue({
        value: storedEntities,
        setValue: mockSetValue,
        removeValue: vi.fn(),
        isLoading: false,
      });

      const { result } = renderHook(() => useEntityManager(defaultConfig));

      expect(result.current.entities).toEqual(storedEntities);
      expect(result.current.allEntities).toEqual([...storedEntities, ...BUILT_IN_TEST_ENTITIES]);
    });

    it("creates new entities with generated IDs and timestamps", async () => {
      const { result } = renderHook(() => useEntityManager(defaultConfig));

      const entityInput: CustomEntityInput<TestEntity> = {
        name: "New Entity",
        value: 500,
      };

      const createdEntity = await result.current.addEntity(entityInput);

      expect(createdEntity).toEqual({
        id: "test-1705320000000",
        name: "New Entity",
        value: 500,
        isBuiltIn: false,
        createdAt: "2024-01-15T12:00:00.000Z",
        updatedAt: "2024-01-15T12:00:00.000Z",
      });

      expect(mockSetValue).toHaveBeenCalledWith([createdEntity]);
    });

    it("updates existing entities and timestamps", async () => {
      const existingEntities: TestEntity[] = [
        {
          id: "entity-1",
          name: "Original Name",
          value: 100,
          isBuiltIn: false,
          createdAt: "2024-01-10T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z",
        },
      ];

      vi.mocked(useLocalStorage).mockReturnValue({
        value: existingEntities,
        setValue: mockSetValue,
        removeValue: vi.fn(),
        isLoading: false,
      });

      const { result } = renderHook(() => useEntityManager(defaultConfig));

      await result.current.updateEntity("entity-1", { name: "Updated Name" });

      expect(mockSetValue).toHaveBeenCalledWith([
        expect.objectContaining({
          id: "entity-1",
          name: "Updated Name",
          value: 100,
          updatedAt: "2024-01-15T12:00:00.000Z",
          createdAt: "2024-01-10T00:00:00.000Z",
        }),
      ]);
    });

    it("deletes entities from storage", async () => {
      const existingEntities: TestEntity[] = [
        {
          id: "entity-1",
          name: "Entity to Delete",
          value: 100,
          isBuiltIn: false,
          createdAt: "2024-01-10T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z",
        },
        {
          id: "entity-2",
          name: "Entity to Keep",
          value: 200,
          isBuiltIn: false,
          createdAt: "2024-01-10T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z",
        },
      ];

      vi.mocked(useLocalStorage).mockReturnValue({
        value: existingEntities,
        setValue: mockSetValue,
        removeValue: vi.fn(),
        isLoading: false,
      });

      const { result } = renderHook(() => useEntityManager(defaultConfig));

      await result.current.deleteEntity("entity-1");

      expect(mockSetValue).toHaveBeenCalledWith([existingEntities[1]]);
    });
  });

  describe("Storage Integration", () => {
    it("bootstraps with built-in entities when storage is empty", () => {
      vi.mocked(useLocalStorage).mockReturnValue({
        value: [],
        setValue: mockSetValue,
        removeValue: vi.fn(),
        isLoading: false,
      });

      renderHook(() => useEntityManager(defaultConfig));

      expect(mockSetValue).toHaveBeenCalledWith([
        {
          ...BUILT_IN_TEST_ENTITIES[0],
          createdAt: "2024-01-15T12:00:00.000Z",
          updatedAt: "2024-01-15T12:00:00.000Z",
        },
      ]);
    });

    it("does not bootstrap when entities already exist", () => {
      const existingEntities: TestEntity[] = [
        {
          id: "existing-1",
          name: "Existing Entity",
          value: 300,
          isBuiltIn: false,
          createdAt: "2024-01-10T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z",
        },
      ];

      vi.mocked(useLocalStorage).mockReturnValue({
        value: existingEntities,
        setValue: mockSetValue,
        removeValue: vi.fn(),
        isLoading: false,
      });

      renderHook(() => useEntityManager(defaultConfig));

      expect(mockSetValue).not.toHaveBeenCalled();
    });

    it("finds entities by ID across both stored and built-in entities", () => {
      const storedEntities: TestEntity[] = [
        {
          id: "stored-1",
          name: "Stored Entity",
          value: 300,
          isBuiltIn: false,
          createdAt: "2024-01-10T00:00:00.000Z",
          updatedAt: "2024-01-10T00:00:00.000Z",
        },
      ];

      vi.mocked(useLocalStorage).mockReturnValue({
        value: storedEntities,
        setValue: mockSetValue,
        removeValue: vi.fn(),
        isLoading: false,
      });

      const { result } = renderHook(() => useEntityManager(defaultConfig));

      expect(result.current.getEntityById("stored-1")).toEqual(storedEntities[0]);
      expect(result.current.getEntityById("builtin-1")).toEqual(BUILT_IN_TEST_ENTITIES[0]);
      expect(result.current.getEntityById("non-existent")).toBeUndefined();
    });
  });
});
