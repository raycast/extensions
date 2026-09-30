import type { Layout } from "./types";

enum LayoutValidationError {
  EMPTY_LAYOUT = "Layout cannot be empty",
  INCONSISTENT_COLUMNS = "All rows must have the same number of columns",
  INVALID_WINDOW_NUMBERS = "Window numbers must be positive integers",
  DISCONTINUOUS_NUMBERS = "Window numbers must be continuous starting from 1",
  INVALID_SPANNING = "Invalid window spanning detected",
  NO_LAYOUT = "Layout is undefined or null",
  EMPTY_ROW = "Empty rows are not allowed",
}

type ValidationResult = Readonly<{
  isValid: boolean;
  errors: LayoutValidationError[];
}>;

/**
 * Validates a window layout configuration
 *
 * Valid layout:
 * [
 *   [1, 1, 2],
 *   [3, 4, 2]
 * ]
 *
 * Invalid layouts:
 * [
 *   [1, 1, 2],
 *   [3, 4]     // Inconsistent columns
 * ]
 * [
 *   [1, 1, 3]  // Missing window number 2
 *   [4, 5, 3]
 * ]
 * [
 *  [1, 2, 1] // Invalid spanning
 * ]
 */
export function validateLayout(layout: Layout | null | undefined): ValidationResult {
  const errors: LayoutValidationError[] = [];

  // Check if layout exists
  if (!layout) {
    return {
      isValid: false,
      errors: [LayoutValidationError.NO_LAYOUT],
    };
  }

  // Check if layout is empty
  if (layout.length === 0) {
    return {
      isValid: false,
      errors: [LayoutValidationError.EMPTY_LAYOUT],
    };
  }

  // Check for empty rows
  if (layout.some((row) => row.length === 0)) {
    errors.push(LayoutValidationError.EMPTY_ROW);
  }

  // Check for consistent number of columns
  const firstRowLength = layout[0].length;
  const hasInconsistentColumns = layout.some((row) => row.length !== firstRowLength);
  if (hasInconsistentColumns) {
    errors.push(LayoutValidationError.INCONSISTENT_COLUMNS);
  }

  // Track window numbers for validation
  const windowNumbers = new Set<number>();
  const windowPositions = new Map<number, Array<[number, number]>>();

  // Collect all window numbers and their positions
  layout.forEach((row, rowIndex) => {
    row.forEach((windowNumber, colIndex) => {
      windowNumbers.add(windowNumber);

      if (!windowPositions.has(windowNumber)) {
        windowPositions.set(windowNumber, []);
      }
      windowPositions.get(windowNumber)?.push([rowIndex, colIndex]);
    });
  });

  // Check for positive integers
  if ([...windowNumbers].some((num) => num <= 0 || !Number.isInteger(num))) {
    errors.push(LayoutValidationError.INVALID_WINDOW_NUMBERS);
  }

  // Check for continuous numbers starting from 1
  const maxWindowNumber = Math.max(...windowNumbers);
  for (let i = 1; i <= maxWindowNumber; i++) {
    if (!windowNumbers.has(i)) {
      errors.push(LayoutValidationError.DISCONTINUOUS_NUMBERS);
      break;
    }
  }

  // Validate window spanning
  windowPositions.forEach((positions, windowNumber) => {
    if (positions.length > 1) {
      // Check if positions form a valid rectangle
      const rows = positions.map(([row]) => row);
      const cols = positions.map(([, col]) => col);

      const minRow = Math.min(...rows);
      const maxRow = Math.max(...rows);
      const minCol = Math.min(...cols);
      const maxCol = Math.max(...cols);

      // Check if all positions within the rectangle belong to this window
      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          if (layout[row][col] !== windowNumber) {
            errors.push(LayoutValidationError.INVALID_SPANNING);
            return;
          }
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

export function getLayoutValidationMessage(errors: LayoutValidationError[]): string {
  if (errors.length === 0) return "Layout is valid";

  return "Layout validation failed:\n" + errors.map((error) => `- ${error}`).join("\n");
}
