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
    // Show fields up to the highest filled color. useFormPalette pre-registers
    // all 15 color keys, so counting keys would inflate the count to 15; counting
    // only filled keys would hide a color after an empty field (color1, "", color3)
    // and drop it on save.
    let highestFilled = 0;
    for (let i = 1; i <= MAX_COLOR_FIELDS; i++) {
      if (initialValues[`color${i}` as keyof PaletteFormFields]) highestFilled = i;
    }
    return Math.max(1, highestFilled);
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
