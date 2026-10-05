export interface ValidationResult {
  isValid: boolean;
  value?: number;
  error?: string;
}

export function validateWidth(widthString: string): ValidationResult {
  const trimmed = widthString.trim();

  // Empty input is valid (no text wrapping)
  if (trimmed === "") {
    return { isValid: true, value: undefined };
  }

  const width = parseInt(trimmed);

  // If populated, width must strictly be a number
  if (isNaN(width)) {
    return {
      isValid: false,
      error: "Please enter a valid number (or leave blank for no text wrapping)",
    };
  }

  // If populated, width must be a positive number
  if (width <= 0) {
    return {
      isValid: false,
      error: "Width must be a positive number (or leave blank for no text wrapping)",
    };
  }

  return { isValid: true, value: width };
}

export function formatWrappingMessage(width: number | undefined): string {
  return width ? `Text re-wrapped at ${width} characters` : "No text wrapping applied";
}
