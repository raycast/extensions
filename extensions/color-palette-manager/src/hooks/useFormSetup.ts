import { useMemo } from "react";
import { CLEAR_FORM_VALUES } from "../constants";
import { AILaunchContext, PaletteFormFields } from "../types";

type UseFormSetupReturn = {
  initialValues: PaletteFormFields;
};

type UseFormSetupProps = {
  launchContext?: AILaunchContext | undefined;
  draftValues?: PaletteFormFields | undefined;
};

/**
 * Handles form initialization with priority-based value calculation:
 * 1. Draft values (if editing) - highest priority
 * 2. Selected colors (if available) - medium priority
 * 3. Default values (fallback) - lowest priority
 */
export function useFormSetup({ draftValues, launchContext = {} }: UseFormSetupProps): UseFormSetupReturn {
  const selectedColors = launchContext.selectedColors || [];
  const AItitle = launchContext.AItext?.title || "";
  const AIdescription = launchContext.AItext?.description || "";

  const initialValues = useMemo((): PaletteFormFields => {
    const values: PaletteFormFields = { ...CLEAR_FORM_VALUES };

    // 1. Draft values
    if (draftValues) {
      Object.assign(values, draftValues);
      return values;
    }

    // 2. Selected colors
    if (selectedColors.length > 0) {
      if (AItitle) {
        values.name = AItitle;
      }
      if (AIdescription) {
        values.description = AIdescription;
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
  }, [draftValues, selectedColors, AItitle, AIdescription]);

  return {
    initialValues,
  };
}
