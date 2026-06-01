// Message Type Constants for WebSocket Communication
export const MESSAGE_TYPES = {
  // Tab Management
  ACTIVATE_TAB: "ACTIVATE_TAB",
  CLOSE_TAB: "CLOSE_TAB",
  MOVE_BY_MATCH: "MOVE_BY_MATCH",
  UNGROUP_BY_MATCH: "UNGROUP_BY_MATCH",
  CREATE_TAB_GROUP: "CREATE_TAB_GROUP",
  DISCARD_BY_MATCH: "DISCARD_BY_MATCH",
  TOGGLE_PIN: "TOGGLE_PIN",

  // Media Controls
  TOGGLE_MEDIA: "TOGGLE_MEDIA",
  SEEK_MEDIA: "SEEK_MEDIA",
  SEEK_COMPLETE: "SEEK_COMPLETE",

  // Navigation
  NAVIGATE_BY_MATCH: "NAVIGATE_BY_MATCH",

  // Connection
  FORCE_RECONNECT: "FORCE_RECONNECT",
  REFRESH: "REFRESH",
  UPDATE: "UPDATE",
} as const;

export type MessageType = (typeof MESSAGE_TYPES)[keyof typeof MESSAGE_TYPES];

// Browser icon mappings for dropdown and UI elements
export const BROWSER_ICONS: Record<string, string> = {
  all: "all.png",
  edge: "edge.png",
  brave: "brave.png",
  chrome: "chrome.png",
  helium: "helium.png",
};
