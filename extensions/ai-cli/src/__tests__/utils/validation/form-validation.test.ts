import { describe, expect, it } from "vitest";
import { validateFormValues } from "@/utils/validation";
import { FormValues } from "@/types";

describe("validateFormValues", () => {
  const createValidFormValues = (): FormValues => ({
    selectedAgent: "claude",
    template: "slack",
    tone: "professional",
    model: "Sonnet",
    textInput: "Sample text to format",
    additionalContext: "",
    targetFolder: "",
  });

  it("should accept valid form values", () => {
    const result = validateFormValues(createValidFormValues());
    expect(result).toBeUndefined();
  });

  it("should reject invalid text input", () => {
    const emptyText = createValidFormValues();
    emptyText.textInput = "";
    expect(validateFormValues(emptyText)).toBe("Please enter text");

    const whitespaceText = createValidFormValues();
    whitespaceText.textInput = "   \n\t  ";
    expect(validateFormValues(whitespaceText)).toBe("Please enter text");
  });

  it("should reject invalid form field selections", () => {
    const testCases = [
      { field: "template", values: ["", "MANAGE_formats"], error: "Please select a valid template" },
      { field: "tone", values: ["", "MANAGE_tones"], error: "Please select a valid tone" },
      { field: "model", values: ["", "MANAGE_models"], error: "Please select a valid model" },
    ];

    testCases.forEach(({ field, values, error }) => {
      values.forEach((value) => {
        const formValues = createValidFormValues();
        (formValues as any)[field] = value;
        expect(validateFormValues(formValues)).toBe(error);
      });
    });
  });

  it("should allow optional fields to be empty", () => {
    const formValues = createValidFormValues();
    formValues.additionalContext = "";
    formValues.targetFolder = "";
    expect(validateFormValues(formValues)).toBeUndefined();
  });
});
