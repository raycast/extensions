/**
 * Secure URL validation utilities preventing XSS and file system attacks.
 * Only HTTP and HTTPS protocols are allowed for image URLs.
 */

/**
 * Validates URL safety for image sources - only HTTP/HTTPS allowed.
 * Prevents XSS attacks via javascript:, file system access via file:, and data URL injection.
 */
export const isValidImageUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    // Invalid URL format
    return false;
  }
};

export const IMAGE_URL_VALIDATION = {
  /** Allowed protocols for image URLs */
  ALLOWED_PROTOCOLS: ["http:", "https:"] as const,

  /** Supported image templates (for user guidance) */
  SUPPORTED_FORMATS: ["png", "jpg", "jpeg", "gif", "svg", "webp"] as const,

  /** Maximum URL length to prevent abuse */
  MAX_URL_LENGTH: 2048,
} as const;

/**
 * Validates image URL with length and format checks.
 */
export const validateImageUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url || !url.trim()) {
    return { isValid: true }; // Empty URLs are valid (optional field)
  }

  if (url.length > IMAGE_URL_VALIDATION.MAX_URL_LENGTH) {
    return {
      isValid: false,
      error: `URL too long (max ${IMAGE_URL_VALIDATION.MAX_URL_LENGTH} characters)`,
    };
  }

  if (!isValidImageUrl(url)) {
    return {
      isValid: false,
      error: "Please enter a valid HTTP or HTTPS URL",
    };
  }

  return { isValid: true };
};

export const isSecureImageUrl = (url: string | undefined): url is string => {
  return url !== undefined && url.trim() !== "" && isValidImageUrl(url);
};

/**
 * Returns secure image URL or fallback icon with XSS protection.
 * Only HTTP/HTTPS URLs are allowed to prevent attacks.
 */
export const getSecureEntityIcon = (icon: string | undefined, fallbackIcon: string): string => {
  // If an icon URL is provided and securely valid, use it
  if (icon && icon.trim() && isValidImageUrl(icon)) {
    return icon;
  }

  // Use fallback icon for invalid/missing URLs
  return fallbackIcon;
};
