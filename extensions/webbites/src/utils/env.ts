// Environment configuration for the WebBites extension

/**
 * Backend API base URL
 */
export const BACKEND_API_URL = "http://localhost:3003";

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  LOGIN: "/raycast-login",
  LOGOUT: "/raycast-logout",
  USER: "/raycast-user",
  BOOKMARKS: "/raycast-bookmarks",
} as const;

/**
 * Helper function to build full API URLs
 * @param endpoint - The API endpoint
 * @returns Full URL for the API endpoint
 */
export const buildApiUrl = (endpoint: string): string => {
  return `${BACKEND_API_URL}${endpoint}`;
};