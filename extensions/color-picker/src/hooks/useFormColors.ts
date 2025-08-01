import { useMemo, useState } from "react";
import { PaletteFormFields, UseFormColorsObject } from "../types";

type UseFormColorsReturn = {
  colorFields: UseFormColorsObject;
};

/**
 * Calculates initial color count from form values and manages dynamic color field state.
 * Provides functions to add/remove color fields with minimum of one field.
 */
export function useFormColors(initialValues: PaletteFormFields): UseFormColorsReturn {
  const initialColorCount = useMemo(() => {
    const colorKeys = Object.keys(initialValues).filter((key) => key.startsWith("color") && key !== "colors");
    return Math.max(1, colorKeys.length);
  }, [initialValues]);

  const [count, setCount] = useState<number>(initialColorCount);

  const addColor = () => {
    setCount((prev) => prev + 1);
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
