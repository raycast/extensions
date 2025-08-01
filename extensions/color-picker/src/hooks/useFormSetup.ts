import { useMemo } from "react";
import { CLEAR_FORM_VALUES } from "../constants";
import { ColorItem, PaletteFormFields } from "../types";

type UseFormSetupReturn = {
  initialValues: PaletteFormFields;
};

/**
 * Handles form initialization with priority-based value calculation:
 * 1. Draft values (if editing) - highest priority
 * 2. Selected colors (if available) - medium priority
 * 3. Default values (fallback) - lowest priority
 */
export function useFormSetup({
  draftValues,
  launchContext = {},
}: {
  draftValues: PaletteFormFields | undefined;
  launchContext?: {
    selectedColors?: ColorItem[];
    text?: string;
  };
}): UseFormSetupReturn {
  const selectedColors = launchContext.selectedColors || [];
  const AIprompt = launchContext.text || "";

  const initialValues = useMemo((): PaletteFormFields => {
    const values: PaletteFormFields = { ...CLEAR_FORM_VALUES };

    // 1. Draft values
    if (draftValues) {
      Object.assign(values, draftValues);
      return values;
    }

    // 2. Selected colors
    if (selectedColors.length > 0) {
      if (AIprompt) {
        if (AIprompt.length <= 30) {
          values.name = AIprompt;
        } else {
          values.description = AIprompt;
        }
      }

      // Set color fields from selected colors
      selectedColors.forEach((color, index) => {
        const colorKey = `color${index + 1}`;
        (values as Record<string, unknown>)[colorKey] = color.color;
      });

      return values;
    }

    // 3: Return defaults
    return values;
  }, [draftValues, selectedColors, AIprompt]);

  return {
    initialValues,
  };
}
