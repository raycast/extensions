export const ATOMBERG_API_BASE_URL = "https://api.developer.atomberg-iot.com/v1";

export const ENDPOINTS = {
  GET_ACCESS_TOKEN: "/get_access_token",
  GET_DEVICES: "/get_list_of_devices",
  GET_DEVICE_STATE: "/get_device_state",
  SEND_COMMAND: "/send_command",
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "atomberg-access-token",
  TOKEN_EXPIRY: "atomberg-token-expiry",
} as const;

export const TOKEN_EXPIRY_HOURS = 24;
export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes
