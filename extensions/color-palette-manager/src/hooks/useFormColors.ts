import { useMemo, useState } from "react";
import { MAX_COLOR_FIELDS } from "../constants";
import { PaletteFormFields, UseFormColorsObject } from "../types";

type UseFormColorsReturn = {
  colorFields: UseFormColorsObject;
};

/**
 * Calculates initial color count from form values and manages dynamic color field state.
 * Provides functions to add/remove color fields with minimum of one field and maximum of 15 fields.
 */
export function useFormColors(initialValues: PaletteFormFields): UseFormColorsReturn {
  const initialColorCount = useMemo(() => {
    // Count only color keys with non-empty values. useFormPalette pre-registers
    // all 15 color keys (so useForm can produce itemProps for any of them); on
    // draft restore those empty keys would otherwise inflate the count to 15.
    const colorKeys = Object.keys(initialValues).filter(
      (key) => key.startsWith("color") && key !== "colors" && !!initialValues[key as keyof PaletteFormFields],
    );
    return Math.max(1, Math.min(MAX_COLOR_FIELDS, colorKeys.length));
  }, [initialValues]);

  const [count, setCount] = useState<number>(initialColorCount);

  const addColor = () => {
    setCount((prev) => Math.min(MAX_COLOR_FIELDS, prev + 1));
  };

  const removeColor = () => {
    setCount((prev) => Math.max(1, prev - 1));
  };

  const resetColors = () => {
    setCount(1);
  };

  return {
    colorFields: {
      count,
      addColor,
      removeColor,
      resetColors,
    },
  };
}
