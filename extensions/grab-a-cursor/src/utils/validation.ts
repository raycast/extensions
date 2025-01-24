/**
 * Validates SVG content to ensure it's properly formatted
 * @param content - The SVG content to validate
 * @returns {boolean} True if the content is valid SVG
 */
export function isValidSVG(content: string): boolean {
  try {
    // Basic SVG validation checks
    const trimmedContent = content.trim();

    // Check if content starts with SVG tag
    if (!trimmedContent.startsWith("<svg")) {
      return false;
    }

    // Check if content ends with closing SVG tag
    if (!trimmedContent.endsWith("</svg>")) {
      return false;
    }

    // Check for basic SVG namespace
    if (!trimmedContent.includes('xmlns="http://www.w3.org/2000/svg"')) {
      return false;
    }

    // Additional validation can be added here if needed
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates cursor name to ensure it meets naming requirements
 * @param name - The cursor name to validate
 * @returns {boolean} True if the name is valid
 */
export function isValidCursorName(name: string): boolean {
  return (
    /^[a-zA-Z0-9-_.\s]+$/.test(name) && name.length > 0 && name.length <= 50
  );
}

/**
 * Validates category name to ensure it meets naming requirements
 * @param category - The category name to validate
 * @returns {boolean} True if the category is valid
 */
export function isValidCategory(category: string): boolean {
  return (
    /^[a-zA-Z0-9-_\s]+$/.test(category) &&
    category.length > 0 &&
    category.length <= 30
  );
}

/**
 * Ensures the cursor size is within acceptable limits
 * @param content - The SVG content to check
 * @returns {boolean} True if the cursor size is acceptable
 */
export function isAcceptableCursorSize(content: string): boolean {
  return content.length > 0 && content.length <= 100000; // Max 100KB
}
