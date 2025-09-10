import { beforeEach, describe, expect, it, vi } from "vitest";
import { showFailureToast, showSuccessToast } from "@/utils/toast";
import { createFieldValidation, handleCreateUpdateOperation } from "@/forms/form-operations";
import { messages } from "@/locale/en/messages";

vi.mock("../../utils/toast", () => ({
  showSuccessToast: vi.fn(),
  showFailureToast: vi.fn(),
}));

describe("form-operations", () => {
  describe("Form Submission Handling", () => {
    const mockCreateOperation = vi.fn();
    const mockUpdateOperation = vi.fn();

    const operationMessages = {
      createSuccessTitle: "Template Created",
      updateSuccessTitle: "Template Updated",
      createErrorTitle: "Failed to Create Template",
      updateErrorTitle: "Failed to Update Template",
    };

    beforeEach(() => {
      mockCreateOperation.mockClear();
      mockUpdateOperation.mockClear();
    });

    it("handles successful create form submissions", async () => {
      const newItem = { id: "123", name: "New Template" };
      mockCreateOperation.mockResolvedValue(newItem);

      const result = await handleCreateUpdateOperation({
        isEditing: false,
        itemName: "New Template",
        createOperation: mockCreateOperation,
        updateOperation: mockUpdateOperation,
        messages: operationMessages,
      });

      expect(mockCreateOperation).toHaveBeenCalledOnce();
      expect(mockUpdateOperation).not.toHaveBeenCalled();
      expect(showSuccessToast).toHaveBeenCalledWith("Template Created", 'Successfully created "New Template"');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(newItem);
      }
    });

    it("handles successful update form submissions", async () => {
      const updatedItem = { id: "123", name: "Updated Template" };
      mockUpdateOperation.mockResolvedValue(updatedItem);

      const result = await handleCreateUpdateOperation({
        isEditing: true,
        itemName: "Updated Template",
        createOperation: mockCreateOperation,
        updateOperation: mockUpdateOperation,
        messages: operationMessages,
      });

      expect(mockUpdateOperation).toHaveBeenCalledOnce();
      expect(mockCreateOperation).not.toHaveBeenCalled();
      expect(showSuccessToast).toHaveBeenCalledWith("Template Updated", 'Successfully updated "Updated Template"');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(updatedItem);
      }
    });

    it("handles form submission failures with user feedback", async () => {
      const error = new Error("Database connection failed");
      mockCreateOperation.mockRejectedValue(error);

      const result = await handleCreateUpdateOperation({
        isEditing: false,
        itemName: "New Template",
        createOperation: mockCreateOperation,
        updateOperation: mockUpdateOperation,
        messages: operationMessages,
      });

      expect(showFailureToast).toHaveBeenCalledWith("Failed to Create Template", "Database connection failed");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Database connection failed");
      }
    });

    it("handles unknown form submission errors", async () => {
      mockCreateOperation.mockRejectedValue("String error");

      const result = await handleCreateUpdateOperation({
        isEditing: false,
        itemName: "New Template",
        createOperation: mockCreateOperation,
        updateOperation: mockUpdateOperation,
        messages: operationMessages,
      });

      expect(showFailureToast).toHaveBeenCalledWith("Failed to Create Template", messages.generic.unexpectedError);
      expect(result.success).toBe(false);
    });
  });

  describe("Form Field Validation", () => {
    it("validates required fields for user input", () => {
      const validator = createFieldValidation({ isRequired: true });

      expect(validator?.("Valid input")).toBeUndefined();
      expect(validator?.("")).toBe(messages.generic.requiredField);
      expect(validator?.("   ")).toBe(messages.generic.requiredField);
    });

    it("handles optional fields without validation", () => {
      const validator = createFieldValidation({ isRequired: false });

      expect(validator).toBeUndefined();
    });

    it("applies custom validation rules", () => {
      const customValidator = vi.fn().mockReturnValue("Custom error");
      const validator = createFieldValidation({ isRequired: true, customValidator });

      const result = validator?.("test input");

      expect(result).toBe("Custom error");
      expect(customValidator).toHaveBeenCalledWith("test input");
    });

    it("prioritizes required validation over custom validation", () => {
      const customValidator = vi.fn().mockReturnValue("Custom error");
      const validator = createFieldValidation({ isRequired: true, customValidator });

      const result = validator?.("");

      expect(result).toBe(messages.generic.requiredField);
      expect(customValidator).not.toHaveBeenCalled();
    });
  });

  describe("User Form Workflows", () => {
    it("supports typical user create workflow", async () => {
      const mockCreate = vi.fn().mockResolvedValue({ id: "123", name: "User Template" });

      // User validates input
      const validator = createFieldValidation({ isRequired: true });
      expect(validator?.("User Template")).toBeUndefined();

      // User submits form
      const result = await handleCreateUpdateOperation({
        isEditing: false,
        itemName: "User Template",
        createOperation: mockCreate,
        updateOperation: vi.fn(),
        messages: {
          createSuccessTitle: "Template Created",
          updateSuccessTitle: "Template Updated",
          createErrorTitle: "Failed to Create",
          updateErrorTitle: "Failed to Update",
        },
      });

      expect(result.success).toBe(true);
      expect(showSuccessToast).toHaveBeenCalledWith("Template Created", 'Successfully created "User Template"');
    });

    it("supports typical user edit workflow", async () => {
      const mockUpdate = vi.fn().mockResolvedValue({ id: "123", name: "Updated Template" });

      // User validates input
      const validator = createFieldValidation({ isRequired: true });
      expect(validator?.("Updated Template")).toBeUndefined();

      // User submits edit form
      const result = await handleCreateUpdateOperation({
        isEditing: true,
        itemName: "Updated Template",
        createOperation: vi.fn(),
        updateOperation: mockUpdate,
        messages: {
          createSuccessTitle: "Template Created",
          updateSuccessTitle: "Template Updated",
          createErrorTitle: "Failed to Create",
          updateErrorTitle: "Failed to Update",
        },
      });

      expect(result.success).toBe(true);
      expect(showSuccessToast).toHaveBeenCalledWith("Template Updated", 'Successfully updated "Updated Template"');
    });

    it("handles user input validation errors", () => {
      const validator = createFieldValidation({ isRequired: true });

      // User submits empty form
      const validationResult = validator?.("");
      expect(validationResult).toBe(messages.generic.requiredField);

      // User submits whitespace-only form
      const whitespaceResult = validator?.("   ");
      expect(whitespaceResult).toBe(messages.generic.requiredField);
    });
  });
});
