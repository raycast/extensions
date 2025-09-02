import { describe, expect, it } from "vitest";
import {
  convertFormValuesToFormatData,
  createInitialFormValues,
  TemplateEditFormValues,
  validateConvertedTemplate,
} from "@/components/CustomTemplateManager/components/TemplateEditForm.helpers";
import { CustomTemplate } from "@/hooks/useCustomTemplates";
import { messages } from "@/locale/en/messages";

describe("TemplateEditForm validation", () => {
  describe("when converting form values to template data", () => {
    it("converts complete form values correctly", () => {
      const values: TemplateEditFormValues = {
        name: "Test Template",
        instructions: "Core instructions",
        requirements: "Requirements section",
        outputInstructions: "Output instructions",
        icon: "https://example.com/icon.png",
      };

      const result = convertFormValuesToFormatData(values);

      expect(result).toEqual({
        name: "Test Template",
        icon: "https://example.com/icon.png",
        sections: {
          instructions: "Core instructions",
          requirements: "Requirements section",
          output: "Output instructions",
        },
      });
    });

    it("handles empty optional fields by converting to undefined", () => {
      const values: TemplateEditFormValues = {
        name: "Test Template",
        instructions: "Core instructions",
        requirements: "",
        outputInstructions: "",
        icon: "",
      };

      const result = convertFormValuesToFormatData(values);

      expect(result).toEqual({
        name: "Test Template",
        icon: "",
        sections: {
          instructions: "Core instructions",
          requirements: undefined,
          output: undefined,
        },
      });
    });
  });

  describe("when validating converted template data", () => {
    it("accepts valid template with instructions", () => {
      const formatData = {
        name: "Test",
        icon: "",
        sections: {
          instructions: "Valid instructions",
        },
      };

      expect(() => validateConvertedTemplate(formatData)).not.toThrow();
    });

    it("rejects template with empty instructions", () => {
      const formatData = {
        name: "Test",
        icon: "",
        sections: {
          instructions: "",
        },
      };

      expect(() => validateConvertedTemplate(formatData)).toThrow(
        messages.validation.templateForm.templateConversionFailed
      );
    });

    it("rejects template with missing instructions", () => {
      const formatData = {
        name: "Test",
        icon: "",
        sections: {},
      } as any;

      expect(() => validateConvertedTemplate(formatData)).toThrow(
        messages.validation.templateForm.templateConversionFailed
      );
    });
  });

  describe("when creating initial form values", () => {
    it("populates form from existing template data", () => {
      const format: CustomTemplate = {
        id: "test-id",
        name: "Test Format",
        icon: "test-icon.png",
        sections: {
          instructions: "Test instructions",
          requirements: "Test requirements",
          output: "Test output",
        },
        isBuiltIn: false,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      };

      const result = createInitialFormValues(format);

      expect(result).toEqual({
        name: "Test Format",
        instructions: "Test instructions",
        requirements: "Test requirements",
        outputInstructions: "Test output",
        icon: "test-icon.png",
      });
    });

    it("provides empty form for new template creation", () => {
      const result = createInitialFormValues();

      expect(result).toEqual({
        name: "",
        instructions: "",
        requirements: "",
        outputInstructions: "",
        icon: "",
      });
    });

    it("handles template with partial sections", () => {
      const format: CustomTemplate = {
        id: "test-id",
        name: "Test Format",
        icon: "test-icon.png",
        sections: {
          instructions: "Test instructions",
        },
        isBuiltIn: false,
        createdAt: "2023-01-01T00:00:00.000Z",
        updatedAt: "2023-01-01T00:00:00.000Z",
      };

      const result = createInitialFormValues(format);

      expect(result).toEqual({
        name: "Test Format",
        instructions: "Test instructions",
        requirements: "",
        outputInstructions: "",
        icon: "test-icon.png",
      });
    });
  });
});
