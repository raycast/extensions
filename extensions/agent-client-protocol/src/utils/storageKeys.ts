/**
 * Storage Keys Constants for Raycast LocalStorage
 *
 * Centralized management of all LocalStorage keys used by the ACP extension
 * to ensure consistency and avoid conflicts.
 */

export const STORAGE_KEYS = {
  // Agent Configuration Storage
  AGENT_CONFIGS: "acp.agents",
  DEFAULT_AGENT: "acp.defaultAgent",
  AGENT_HEALTH: "acp.agentHealth",

  // Conversation and Session Storage
  CONVERSATIONS: "acp.conversations",
  ACTIVE_SESSIONS: "acp.sessions",
  SESSION_HISTORY: "acp.sessionHistory",

  // User Preferences
  PREFERENCES: "acp.preferences",
  UI_STATE: "acp.uiState",
  LAST_USED_AGENT: "acp.lastUsedAgent",
  LAST_CHAT_CONFIG: "acp.lastChatConfig",

  // Security and Permissions
  SECURITY_SETTINGS: "acp.security",
  FILE_PERMISSIONS: "acp.filePermissions",
  ALLOWED_DIRECTORIES: "acp.allowedDirs",

  // Context and File Management
  PROJECT_CONTEXTS: "acp.contexts",
  FILE_CACHE: "acp.fileCache",
  RECENT_FILES: "acp.recentFiles",

  // Error and Logging
  ERROR_LOG: "acp.errors",
  DEBUG_LOG: "acp.debug",
  PERFORMANCE_METRICS: "acp.performance",

  // Feature Flags and Settings
  FEATURE_FLAGS: "acp.features",
  ONBOARDING_STATE: "acp.onboarding",
  EXTENSION_VERSION: "acp.version",
} as const;

// Type-safe storage key type
export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// Storage key validation
export function isValidStorageKey(key: string): key is StorageKey {
  return Object.values(STORAGE_KEYS).includes(key as StorageKey);
}

// Storage key categories for batch operations
export const STORAGE_CATEGORIES = {
  AGENT: [
    STORAGE_KEYS.AGENT_CONFIGS,
    STORAGE_KEYS.DEFAULT_AGENT,
    STORAGE_KEYS.AGENT_HEALTH,
    STORAGE_KEYS.LAST_USED_AGENT,
  ],
  SESSION: [STORAGE_KEYS.CONVERSATIONS, STORAGE_KEYS.ACTIVE_SESSIONS, STORAGE_KEYS.SESSION_HISTORY],
  USER: [
    STORAGE_KEYS.PREFERENCES,
    STORAGE_KEYS.UI_STATE,
    STORAGE_KEYS.SECURITY_SETTINGS,
    STORAGE_KEYS.LAST_CHAT_CONFIG,
  ],
  CONTEXT: [
    STORAGE_KEYS.PROJECT_CONTEXTS,
    STORAGE_KEYS.FILE_CACHE,
    STORAGE_KEYS.RECENT_FILES,
    STORAGE_KEYS.FILE_PERMISSIONS,
    STORAGE_KEYS.ALLOWED_DIRECTORIES,
  ],
  SYSTEM: [
    STORAGE_KEYS.ERROR_LOG,
    STORAGE_KEYS.DEBUG_LOG,
    STORAGE_KEYS.PERFORMANCE_METRICS,
    STORAGE_KEYS.FEATURE_FLAGS,
    STORAGE_KEYS.ONBOARDING_STATE,
    STORAGE_KEYS.EXTENSION_VERSION,
  ],
} as const;

// Default values for storage keys
export const DEFAULT_VALUES = {
  [STORAGE_KEYS.AGENT_CONFIGS]: "[]",
  [STORAGE_KEYS.DEFAULT_AGENT]: '""',
  [STORAGE_KEYS.CONVERSATIONS]: "[]",
  [STORAGE_KEYS.ACTIVE_SESSIONS]: "[]",
  [STORAGE_KEYS.PREFERENCES]: JSON.stringify({
    maxMessageHistory: 100,
    autoSaveConversations: true,
    showTypingIndicator: true,
    theme: "auto",
    copyCodeBlocks: true,
    enableNotifications: true,
  }),
  [STORAGE_KEYS.SECURITY_SETTINGS]: JSON.stringify({
    allowFileAccess: false,
    allowedDirectories: [],
    requirePermissionForTools: true,
    enableLogging: false,
    trustedTools: [],
    trustedPaths: [],
  }),
  [STORAGE_KEYS.PROJECT_CONTEXTS]: "[]",
  [STORAGE_KEYS.ERROR_LOG]: "[]",
  [STORAGE_KEYS.FEATURE_FLAGS]: "{}",
} as const;

// Storage migration version tracking
export const STORAGE_VERSION = "1.0.0";
export const STORAGE_VERSION_KEY = "acp.storageVersion";

/**
 * Get the default value for a storage key
 */
export function getDefaultValue(key: StorageKey): string {
  const value = DEFAULT_VALUES[key as keyof typeof DEFAULT_VALUES];
  return value !== undefined ? value : "null";
}

/**
 * Check if a storage key belongs to a specific category
 */
export function isKeyInCategory(key: StorageKey, category: keyof typeof STORAGE_CATEGORIES): boolean {
  const categoryKeys = STORAGE_CATEGORIES[category] as readonly string[];
  return categoryKeys.some((k) => k === key);
}
