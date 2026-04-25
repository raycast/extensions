import { useCallback, useRef } from "react";
import { CLEAR_FORM_VALUES } from "../constants";
import {
  PaletteFormFields,
  UseFormActionsObject,
  UseFormColorsObject,
  UseFormFocusObject,
  UseFormKeywordsObject,
  UseFormPaletteObject,
} from "../types";

type UseFormActionsReturn = {
  formActions: UseFormActionsObject;
};

/**
 * Coordinates form actions across multiple concerns (colors, keywords, focus).
 * Acts as a behavioral orchestrator for complex form interactions.
 */
export function useFormActions({
  colorFields,
  form,
  focus,
  keywords,
}: {
  colorFields: UseFormColorsObject;
  form: UseFormPaletteObject;
  focus: UseFormFocusObject;
  keywords: UseFormKeywordsObject;
}): UseFormActionsReturn {
  // Track timeout references for cleanup
  const timeoutRefs = useRef<Set<NodeJS.Timeout>>(new Set());

  /**
   * Safely sets a timeout and tracks it for cleanup
   */
  const setSafeTimeout = useCallback((callback: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      timeoutRefs.current.delete(timeoutId);
      callback();
    }, delay);
    timeoutRefs.current.add(timeoutId);
    return timeoutId;
  }, []);

  /**
   * Clears the form and resets to initial state.
   */
  const clear = () => {
    colorFields.resetColors();
    form.reset(CLEAR_FORM_VALUES);
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
    setSafeTimeout(() => {
      focus.set(newColorFieldId);
    }, 50); // Sufficient delay for state update and DOM rendering
  };

  /**
   * Removes the currently focused color field based on focus.currentField.
   * If no field is currently focused (e.g., Action Panel opened),
   * uses the last focused field as fallback.
   * Reorganizes remaining colors to fill the gap and updates focus.
   */
  const removeColor = () => {
    // Get the currently focused field, with fallback to last focused field if it's a color field
    const activeField = focus.currentField || focus.lastField;

    // Check if we have a valid color field to work with
    if (!activeField || !activeField.startsWith("color")) {
      return;
    }

    // Ensure we have minimum color count
    if (colorFields.count <= 1) {
      return;
    }

    // Extract the color index from the field name (e.g., "color3" -> 3)
    const colorIndexMatch = activeField.match(/^color(\d+)$/);
    if (!colorIndexMatch) {
      return;
    }

    const colorIndex = parseInt(colorIndexMatch[1], 10);

    if (colorIndex < 1 || colorIndex > colorFields.count) {
      return;
    }

    // Get current values for all color fields
    const currentColors: string[] = [];
    for (let i = 1; i <= colorFields.count; i++) {
      const colorKey = `color${i}` as keyof PaletteFormFields;
      const colorValue = form.colors[colorKey]?.value as string;
      if (colorValue) {
        currentColors.push(colorValue);
      }
    }

    // Remove the specific color from the array
    currentColors.splice(colorIndex - 1, 1);

    // Clear all color fields first
    for (let i = 1; i <= colorFields.count; i++) {
      const colorKey = `color${i}` as keyof PaletteFormFields;
      form.update(colorKey, "");
    }

    // Reassign the remaining colors to consecutive fields
    currentColors.forEach((color, index) => {
      const colorKey = `color${index + 1}` as keyof PaletteFormFields;
      form.update(colorKey, color);
    });

    // Update the color count
    colorFields.removeColor();

    // Set focus to a reasonable field after removal
    // If we removed the last field, focus on the new last field
    // Otherwise, focus on the same index (which now contains the next color)
    const newFocusIndex = Math.min(colorIndex, colorFields.count - 1);
    const newFocusField = `color${Math.max(1, newFocusIndex)}`;
    setSafeTimeout(() => {
      focus.set(newFocusField);
    }, 50);
  };

  /**
   * Handles keyword input parsing and form state updates.
   */
  const updateKeywords = async (keywordsText: string) => {
    const result = await keywords.update(keywordsText);
    form.update("keywords", (prev: string[]) => [...prev, ...result.validKeywords]);
    return result;
  };

  const getPreview = () => ({
    // create a new array with only the color values (filter out undefined)
    colors: Object.values(form.colors)
      .map((item) => item.value)
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  });

  return {
    formActions: {
      clear,
      addColor,
      removeColor,
      updateKeywords,
      getPreview,
    },
  };
}
