import { REM_BASE, parseNumericInput, roundNumber } from "./utils";

export type ClampInputs = {
  minViewportWidth: string;
  maxViewportWidth: string;
  minFontSize: string;
  maxFontSize: string;
  unit: TUnit;
};

export type ClampResult = { ok: true; value: string } | { ok: false; error: string };

type ParsedInputs = {
  minViewportWidth: number;
  maxViewportWidth: number;
  minFontSize: number;
  maxFontSize: number;
  unit: TUnit;
};

/**
 * Build a `clamp()` declaration from already-validated numeric inputs.
 * Output is always expressed in `rem` (the accessible choice for fluid type).
 */
export function generateClamp(values: ParsedInputs): string {
  const toRem = (value: number) => (values.unit === "rem" ? value : value / REM_BASE);

  const minViewportWidth = toRem(values.minViewportWidth);
  const maxViewportWidth = toRem(values.maxViewportWidth);
  const minFontSize = toRem(values.minFontSize);
  const maxFontSize = toRem(values.maxFontSize);

  const slope = (maxFontSize - minFontSize) / (maxViewportWidth - minViewportWidth);
  const intersection = roundNumber(minFontSize - minViewportWidth * slope);

  const min = `${roundNumber(minFontSize)}rem`;
  const max = `${roundNumber(maxFontSize)}rem`;
  const preferred = `${intersection}rem + ${roundNumber(slope * 100)}vw`;

  return `clamp(${min}, ${preferred}, ${max})`;
}

/**
 * Validate raw string inputs and produce a `clamp()` declaration, or a human-readable error.
 * Single source of truth shared by the live preview and the copy action, so the user can
 * never copy invalid CSS (no `Infinity`, `NaN`, or silently dropped values).
 */
export function computeClamp(inputs: ClampInputs): ClampResult {
  const minViewportWidth = parseNumericInput(inputs.minViewportWidth);
  const maxViewportWidth = parseNumericInput(inputs.maxViewportWidth);
  const minFontSize = parseNumericInput(inputs.minFontSize);
  const maxFontSize = parseNumericInput(inputs.maxFontSize);

  if (minViewportWidth === null || maxViewportWidth === null || minFontSize === null || maxFontSize === null) {
    return { ok: false, error: "Enter a valid number in every field." };
  }

  if (minViewportWidth <= 0 || maxViewportWidth <= 0 || minFontSize <= 0 || maxFontSize <= 0) {
    return { ok: false, error: "Values must be greater than 0." };
  }

  if (maxViewportWidth <= minViewportWidth) {
    return { ok: false, error: "Max viewport width must be greater than min viewport width." };
  }

  if (maxFontSize < minFontSize) {
    return { ok: false, error: "Max font size must be greater than or equal to min font size." };
  }

  return {
    ok: true,
    value: generateClamp({ minViewportWidth, maxViewportWidth, minFontSize, maxFontSize, unit: inputs.unit }),
  };
}
