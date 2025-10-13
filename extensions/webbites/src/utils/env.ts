// Environment configuration for the WebBites extension

/**
 * Backend API base URL
 */
export const BACKEND_API_URL = "https://api.webbites.io/";

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  LOGIN: "raycast-login",
  LOGOUT: "raycast-logout",
  USER: "raycast-user",
  BOOKMARKS: "raycast-bookmarks",
} as const;

/**
 * Helper function to build full API URLs
 * @param endpoint - The API endpoint (must be one of the defined API_ENDPOINTS values)
 * @returns Full URL for the API endpoint
 */
export const buildApiUrl = (
  endpoint: (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS],
): string => {
  return `${BACKEND_API_URL}${endpoint}`;
};
