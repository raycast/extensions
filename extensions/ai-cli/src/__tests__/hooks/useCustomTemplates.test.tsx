import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { CustomTemplate, useCustomTemplates } from "@/hooks/useCustomTemplates";
import { useEntityManager } from "@/hooks/useEntityManager";
import { messages } from "@/locale/en/messages";
import { TEMPLATE_TYPES } from "@/constants";
import { createTemplate } from "@/__tests__/test-factories";
import { createMockCustomTemplate } from "@/__tests__/test-utils";

// Mock useEntityManager
vi.mock("../../hooks/useEntityManager");

describe("useCustomTemplates", () => {
  const mockAddEntity = vi.fn();
  const mockUpdateEntity = vi.fn();
  const mockDeleteEntity = vi.fn();
  const mockGetEntityById = vi.fn();
  const mockRefreshEntities = vi.fn();

  // Use simple factory function for test data
  const sampleCustomTemplates: CustomTemplate[] = [
    createTemplate({
      id: "template-1",
      name: "Email Template",
      sections: { instructions: "Format as professional email" },
      createdAt: "2024-01-01T10:00:00.000Z",
      updatedAt: "2024-01-01T10:00:00.000Z",
    }),
  ];

  const mockEntityManagerReturn = {
    entities: sampleCustomTemplates,
    allEntities: sampleCustomTemplates,
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
      return sampleCustomTemplates.find((entity) => entity.id === id);
    });
  });

  describe("Custom Format Management Workflows", () => {
    it("allows users to create and save custom templates", async () => {
      const newFormat = createMockCustomTemplate({
        id: "template-2",
        name: "Email Template",
        sections: {
          instructions: "Format as professional email",
        },
      });
      mockAddEntity.mockResolvedValue(newFormat);

      const { result } = renderHook(() => useCustomTemplates());

      const createdFormat = await result.current.addTemplate({
        name: "Email Template",
        sections: {
          instructions: "Format as professional email",
        },
      });
      expect(createdFormat).toEqual(newFormat);

      expect(result.current.templates).toContainEqual(expect.objectContaining({ name: "Email Template" }));
    });

    it("allows users to edit existing custom templates", async () => {
      const updatedFormat = { ...sampleCustomTemplates[0], name: "Updated Email Template" };
      mockUpdateEntity.mockResolvedValue(updatedFormat);

      const { result } = renderHook(() => useCustomTemplates());

      const result_template = await result.current.updateTemplate("template-1", {
        name: "Updated Email Template",
      });
      expect(result_template).toEqual(updatedFormat);
    });

    it("allows users to delete custom templates", async () => {
      mockDeleteEntity.mockResolvedValue(undefined);
      const { result } = renderHook(() => useCustomTemplates());

      await result.current.deleteTemplate("template-1");

      // In real usage, the format would be removed from the list
      expect(mockDeleteEntity).toHaveBeenCalledWith("template-1");
    });

    it("integrates with storage to persist custom templates", () => {
      const { result } = renderHook(() => useCustomTemplates());

      // Verify templates are loaded from storage
      expect(result.current.templates).toEqual(sampleCustomTemplates);
      expect(result.current.getTemplateById("template-1")).toEqual(sampleCustomTemplates[0]);
    });
  });

  describe("Error Handling and Recovery", () => {
    it("handles template creation errors gracefully", async () => {
      const creationError = new Error("Failed to create format");
      mockAddEntity.mockRejectedValue(creationError);

      const { result } = renderHook(() => useCustomTemplates());

      await expect(
        result.current.addTemplate({
          name: "Test Format",
          sections: {
            instructions: "Test template",
          },
        })
      ).rejects.toThrow("Failed to create format");
    });

    it("handles format update errors gracefully", async () => {
      const updateError = new Error("Failed to update format");
      mockUpdateEntity.mockRejectedValue(updateError);

      const { result } = renderHook(() => useCustomTemplates());

      await expect(result.current.updateTemplate("template-1", { name: "New Name" })).rejects.toThrow(
        "Failed to update format"
      );
    });

    it("handles format deletion errors gracefully", async () => {
      const deleteError = new Error("Failed to delete template");
      mockDeleteEntity.mockRejectedValue(deleteError);

      const { result } = renderHook(() => useCustomTemplates());

      await expect(result.current.deleteTemplate("template-1")).rejects.toThrow("Failed to delete template");
    });

    it("recovers from storage errors by showing empty state", () => {
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

      const { result } = renderHook(() => useCustomTemplates());

      expect(result.current.templates).toEqual([]);
      expect(result.current.allTemplates).toContainEqual(
        expect.objectContaining({
          id: TEMPLATE_TYPES.CUSTOM,
          name: messages.ui.templates.custom,
        })
      );
    });
  });
});
