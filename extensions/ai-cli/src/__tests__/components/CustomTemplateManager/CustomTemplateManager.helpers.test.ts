import { describe, expect, it, vi } from "vitest";
import {
  createTempTemplate,
  filterTemplates,
  getTemplatesCountMessage,
} from "@/components/CustomTemplateManager/CustomTemplateManager.helpers";
import { shouldShowEmptyView } from "@/utils/entity-list-helpers";
import { CustomTemplate } from "@/hooks/useCustomTemplates";

// Mock the validation helpers
vi.mock("@/utils/validation-helpers", () => ({
  formatStringTemplate: vi.fn((template: string, placeholder: string, value: any) =>
    template.replace(`{${placeholder}}`, value.toString())
  ),
}));

describe("CustomTemplateManager.helpers", () => {
  describe("getTemplatesCountMessage", () => {
    it("should format count message correctly", () => {
      const result = getTemplatesCountMessage(5);
      expect(result).toContain("5");
    });

    it("should handle zero count", () => {
      const result = getTemplatesCountMessage(0);
      expect(result).toContain("0");
    });
  });

  describe("shouldShowEmptyView", () => {
    it("should return true when not loading and no templates", () => {
      expect(shouldShowEmptyView([], false)).toBe(true);
    });

    it("should return false when loading", () => {
      expect(shouldShowEmptyView([], true)).toBe(false);
    });

    it("should return false when has templates", () => {
      const mockTemplates = [{ id: "1", name: "Test" }] as CustomTemplate[];
      expect(shouldShowEmptyView(mockTemplates, false)).toBe(false);
    });
  });

  describe("createTempFormat", () => {
    it("should create a valid temporary format", () => {
      const tempFormat = createTempTemplate();

      expect(tempFormat.id).toBe("");
      expect(tempFormat.name).toBe("");
      expect(tempFormat.sections?.instructions).toBe("");
      expect(tempFormat.isBuiltIn).toBe(false);
    });
  });

  describe("filterTemplates", () => {
    const sampleTemplates: CustomTemplate[] = [
      {
        id: "1",
        name: "Slack Template",
        sections: {
          instructions: "Template for Slack messages",
        },
        icon: "",
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "2",
        name: "PR Format",
        sections: {
          instructions: "Format for GitHub PRs",
        },
        icon: "",
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it("should return all templates when search text is empty", () => {
      const result = filterTemplates(sampleTemplates, "");
      expect(result).toHaveLength(2);
    });

    it("should filter by name", () => {
      const result = filterTemplates(sampleTemplates, "slack");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Slack Template");
    });

    it("should filter by instructions", () => {
      const result = filterTemplates(sampleTemplates, "github");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("PR Format");
    });

    it("should be case insensitive", () => {
      const result = filterTemplates(sampleTemplates, "SLACK");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Slack Template");
    });

    it("should handle whitespace in search", () => {
      const result = filterTemplates(sampleTemplates, "  slack  ");
      expect(result).toHaveLength(1);
    });
  });
});
