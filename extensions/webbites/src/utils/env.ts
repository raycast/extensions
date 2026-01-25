// Environment configuration for the WebBites extension

/**
 * Backend API base URL
 */
// export const BACKEND_API_URL = "http://bold_wilbur.orb.local/";
// export const BACKEND_API_URL = "http://localhost:3003/";
// export const BACKEND_API_URL = "https://api-pre.webbites.io/";
export const BACKEND_API_URL = "https://api.webbites.io/";

/**
 * API endpoints
 */
export const API_ENDPOINTS = {
  LOGIN: "v1/auth/login",
  LOGOUT: "v1/auth/logout",
  USER: "v1/raycast/raycast-user",
  SAVE_BOOKMARK: "v1/content/startSaveProcess",
  SEARCH: "v1/search",
  GENERATE_KEY: "v1/keys/create",
} as const;

/**
 * Helper function to build full API URLs
 * @param endpoint - The API endpoint (must be one of the defined API_ENDPOINTS values)
 * @returns Full URL for the API endpoint
 */
export const buildApiUrl = (endpoint: (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS]): string => {
  return `${BACKEND_API_URL}${endpoint}`;
};
