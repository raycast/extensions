// Helpers
import { roundNumber, convertToRem } from "./utils";

export default function generateClamp(values: {
  minViewportWidth: string;
  maxViewportWidth: string;
  minFontSize: string;
  maxFontSize: string;
  unit: TUnit;
}): string {
  // Turn all values into REM
  const minViewportWidth = convertToRem(values.minViewportWidth, values.unit);
  const maxViewportWidth = convertToRem(values.maxViewportWidth, values.unit);
  const minFontSize = convertToRem(values.minFontSize, values.unit);
  const maxFontSize = convertToRem(values.maxFontSize, values.unit);

  // Calculate values
  const slope = (maxFontSize - minFontSize) / (maxViewportWidth - minViewportWidth);
  const yAxisIntersection = roundNumber(-minViewportWidth * slope + minFontSize);

  // String values
  const min = `${minFontSize}rem`;
  const max = `${maxFontSize}rem`;
  const preferred = `${yAxisIntersection}rem + ${roundNumber(slope * 100)}vw`;

  return `clamp(${min}, ${preferred}, ${max})`;
}
