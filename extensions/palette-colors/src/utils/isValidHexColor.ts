/**
 * Validates HEX color format (#RGB or #RRGGBB).
 */
export const isValidHexColor = (color: string): boolean => {
  // Basic input validation
  if (!color || typeof color !== "string") return false;

  const trimmedColor = color.trim();
  if (!trimmedColor) return false;

  // Regular expression for HEX color format only
  const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

  // Validate hex format (both #RGB and #RRGGBB)
  return hexPattern.test(trimmedColor);
};
