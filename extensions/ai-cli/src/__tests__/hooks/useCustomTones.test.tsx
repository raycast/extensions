import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { CustomTone, useCustomTones } from "@/hooks/useCustomTones";
import { useEntityManager } from "@/hooks/useEntityManager";
import { messages } from "@/locale/en/messages";
import { TONE_TYPES } from "@/constants";
import { createTone } from "@/__tests__/test-factories";
import { createMockCustomTone } from "@/__tests__/test-utils";

// Mock useEntityManager
vi.mock("../../hooks/useEntityManager");

describe("useCustomTones", () => {
  const mockAddEntity = vi.fn();
  const mockUpdateEntity = vi.fn();
  const mockDeleteEntity = vi.fn();
  const mockGetEntityById = vi.fn();
  const mockRefreshEntities = vi.fn();

  // Use simple factory function for test data
  const sampleCustomTones: CustomTone[] = [
    createTone({
      id: "tone-1",
      name: "Casual and Friendly",
      guidelines: "Use informal language with friendly tone",
      createdAt: "2024-01-01T10:00:00.000Z",
      updatedAt: "2024-01-01T10:00:00.000Z",
    }),
  ];

  const mockEntityManagerReturn = {
    entities: sampleCustomTones,
    allEntities: sampleCustomTones,
    isLoading: false,
    addEntity: mockAddEntity,
    updateEntity: mockUpdateEntity,
    deleteEntity: mockDeleteEntity,
    getEntityById: mockGetEntityById,
    refreshEntities: mockRefreshEntities,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useEntityManager).mockReturnValue(mockEntityManagerReturn);
    mockGetEntityById.mockImplementation((id: string) => {
      return sampleCustomTones.find((entity) => entity.id === id);
    });
  });

  describe("Custom Tone Management Workflows", () => {
    it("allows users to create and save custom tones", async () => {
      const newTone = createMockCustomTone({
        id: "tone-2",
        name: "Executive Brief",
        guidelines: "Use executive-level language with focus on key insights",
      });
      mockAddEntity.mockResolvedValue(newTone);

      const { result } = renderHook(() => useCustomTones());

      const createdTone = await result.current.addTone({
        name: "Executive Brief",
        guidelines: "Use executive-level language with focus on key insights",
      });

      // Verify the tone was created with correct data
      expect(createdTone).toEqual(newTone);
      expect(mockAddEntity).toHaveBeenCalledWith({
        name: "Executive Brief",
        guidelines: "Use executive-level language with focus on key insights",
      });
    });

    it("allows users to edit existing custom tones", async () => {
      const updatedTone = { ...sampleCustomTones[0], name: "Updated Friendly Tone" };
      mockUpdateEntity.mockResolvedValue(updatedTone);

      const { result } = renderHook(() => useCustomTones());

      const result_tone = await result.current.updateTone("tone-1", {
        name: "Updated Friendly Tone",
      });
      expect(result_tone).toEqual(updatedTone);
    });

    it("allows users to delete custom tones", async () => {
      mockDeleteEntity.mockResolvedValue(undefined);
      const { result } = renderHook(() => useCustomTones());

      await result.current.deleteTone("tone-1");

      // In real usage, the tone would be removed from the list
      expect(mockDeleteEntity).toHaveBeenCalledWith("tone-1");
    });

    it("integrates with storage to persist custom tones", () => {
      const { result } = renderHook(() => useCustomTones());

      // Verify tones are loaded from storage
      expect(result.current.tones).toEqual(sampleCustomTones);
      expect(result.current.getToneById("tone-1")).toEqual(sampleCustomTones[0]);
    });

    it("provides default tone at first position in allTones", () => {
      const { result } = renderHook(() => useCustomTones());

      expect(result.current.allTones[0]).toEqual(
        expect.objectContaining({
          id: TONE_TYPES.DEFAULT,
          name: messages.toneDescriptions.default.name,
        })
      );
    });
  });

  describe("Error Handling and Recovery", () => {
    it("handles tone creation errors gracefully", async () => {
      const creationError = new Error("Failed to create tone");
      mockAddEntity.mockRejectedValue(creationError);

      const { result } = renderHook(() => useCustomTones());

      await expect(
        result.current.addTone({
          name: "Test Tone",
          guidelines: "Test guidelines",
        })
      ).rejects.toThrow("Failed to create tone");
    });

    it("handles tone update errors gracefully", async () => {
      const updateError = new Error("Failed to update tone");
      mockUpdateEntity.mockRejectedValue(updateError);

      const { result } = renderHook(() => useCustomTones());

      await expect(result.current.updateTone("tone-1", { name: "New Name" })).rejects.toThrow("Failed to update tone");
    });

    it("handles tone deletion errors gracefully", async () => {
      const deleteError = new Error("Failed to delete tone");
      mockDeleteEntity.mockRejectedValue(deleteError);

      const { result } = renderHook(() => useCustomTones());

      await expect(result.current.deleteTone("tone-1")).rejects.toThrow("Failed to delete tone");
    });

    it("recovers from storage errors by showing empty state with default tone", () => {
      vi.mocked(useEntityManager).mockReturnValue({
        entities: [],
        allEntities: [],
        isLoading: false,
        addEntity: vi.fn(),
        updateEntity: vi.fn(),
        deleteEntity: vi.fn(),
        getEntityById: vi.fn().mockReturnValue(undefined),
        refreshEntities: vi.fn(),
      });

      const { result } = renderHook(() => useCustomTones());

      expect(result.current.tones).toEqual([]);
      expect(result.current.allTones).toContainEqual(
        expect.objectContaining({
          id: TONE_TYPES.DEFAULT,
          name: messages.toneDescriptions.default.name,
        })
      );
    });
  });
});
