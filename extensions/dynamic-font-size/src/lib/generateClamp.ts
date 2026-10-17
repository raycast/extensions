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

  // Order the clamp() bounds by value, not by breakpoint, so an inverted range (a larger
  // value at the smaller viewport, e.g. a shrinking size or a moving background position)
  // still produces valid CSS rather than a degenerate `clamp(big, ..., small)`.
  const lowerBound = roundNumber(Math.min(minFontSize, maxFontSize));
  const upperBound = roundNumber(Math.max(minFontSize, maxFontSize));
  const preferred = `${intersection}rem + ${roundNumber(slope * 100)}vw`;

  return `clamp(${lowerBound}rem, ${preferred}, ${upperBound}rem)`;
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

  // The two sizes are intentionally not required to be ordered. An inverted range (a larger
  // value at the smaller viewport) is valid and useful, e.g. a value that shrinks as the
  // viewport grows or a moving background position. generateClamp orders the clamp() bounds
  // so the emitted CSS is always valid regardless of which size is larger.
  return {
    ok: true,
    value: generateClamp({ minViewportWidth, maxViewportWidth, minFontSize, maxFontSize, unit: inputs.unit }),
  };
}
