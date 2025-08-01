import { SetStateAction } from "react";
import { CLEAR_FORM_VALUES } from "../constants";
import { PaletteFormFields, UpdateKeywordsPromiseResult, UseFormActionsObject, UseFormColorsObject } from "../types";

type UseFormActionsReturn = {
  formActions: UseFormActionsObject;
};

/**
 * Coordinates form actions across multiple concerns (colors, keywords, focus).
 * Acts as a behavioral orchestrator for complex form interactions.
 */
export function useFormActions({
  colorFields,
  updateForm,
  resetForm,
  setFocus,
  updateKeywords,
}: {
  colorFields: UseFormColorsObject;
  updateForm: <K extends keyof PaletteFormFields>(id: K, value: SetStateAction<PaletteFormFields[K]>) => void;
  resetForm: (values: PaletteFormFields) => void;
  setFocus: (fieldId: string) => void;
  updateKeywords: (keywordsText: string) => Promise<UpdateKeywordsPromiseResult>;
}): UseFormActionsReturn {
  const clear = () => {
    colorFields.resetColors();
    resetForm(CLEAR_FORM_VALUES);
  };

  /**
   * Adds a new color field and focuses on it.
   */
  const addColor = () => {
    // Calculate the new field ID before state update to avoid race conditions
    const newColorFieldId = `color${colorFields.count + 1}`;

    // Add the new color field (async state update)
    colorFields.addColor();

    // Focus on the newly added color field with a delay to ensure DOM is updated
    setTimeout(() => {
      setFocus(newColorFieldId);
    }, 50); // Sufficient delay for state update and DOM rendering
  };

  /**
   * Removes the last color field and refocuses.
   */
  const removeColor = () => {
    if (colorFields.count > 1) {
      // Clear the value of the last color field before removing it
      const lastColorField = `color${colorFields.count}` as keyof PaletteFormFields;
      updateForm(lastColorField, "");

      // Remove the color field from the UI
      colorFields.removeColor();

      // Focus on the new last color field after removal
      const newLastColorField = `color${colorFields.count - 1}`;
      setFocus(newLastColorField);
    }
  };

  /**
   * Handles keyword input parsing and form state updates.
   */
  const updateFormKeywords = async (keywordsText: string) => {
    const result = await updateKeywords(keywordsText);
    updateForm("keywords", (prev: string[]) => [...prev, ...result.validKeywords]);
    return result;
  };

  return {
    formActions: {
      clear,
      addColor,
      removeColor,
      updateKeywords: updateFormKeywords,
    },
  };
}
