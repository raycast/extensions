/**
 * API-related constants
 */

export const API_ENDPOINTS = {
  SANDBOX: {
    LIST: "/sandbox",
    CREATE: "/sandbox",
    GET: (id: string) => `/sandbox/${id}`,
    DELETE: (id: string) => `/sandbox/${id}`,
    START: (id: string) => `/sandbox/${id}/start`,
    STOP: (id: string) => `/sandbox/${id}/stop`,
    RESTART: (id: string) => `/sandbox/${id}/restart`,
  },
  WORKSPACE: {
    LIST: "/workspace",
    CREATE: "/workspace",
    GET: (id: string) => `/workspace/${id}`,
    DELETE: (id: string) => `/workspace/${id}`,
  },
  SNAPSHOT: {
    LIST: "/snapshot",
    CREATE: "/snapshot",
    GET: (id: string) => `/snapshot/${id}`,
    DELETE: (id: string) => `/snapshot/${id}`,
    RESTORE: (id: string) => `/snapshot/${id}/restore`,
  },
  EXECUTION: {
    RUN: "/execution/run",
    HISTORY: "/execution/history",
    CANCEL: (id: string) => `/execution/${id}/cancel`,
  },
  FILES: {
    LIST: (sandboxId: string, path = "") => `/sandbox/${sandboxId}/files?path=${encodeURIComponent(path)}`,
    READ: (sandboxId: string, path: string) => `/sandbox/${sandboxId}/files/read?path=${encodeURIComponent(path)}`,
    WRITE: (sandboxId: string) => `/sandbox/${sandboxId}/files/write`,
    DELETE: (sandboxId: string, path: string) => `/sandbox/${sandboxId}/files?path=${encodeURIComponent(path)}`,
  },
  GIT: {
    STATUS: (sandboxId: string) => `/sandbox/${sandboxId}/git/status`,
    COMMIT: (sandboxId: string) => `/sandbox/${sandboxId}/git/commit`,
    PUSH: (sandboxId: string) => `/sandbox/${sandboxId}/git/push`,
    PULL: (sandboxId: string) => `/sandbox/${sandboxId}/git/pull`,
    BRANCH: (sandboxId: string) => `/sandbox/${sandboxId}/git/branch`,
  },
} as const;

export const API_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  RATE_LIMIT: {
    REQUESTS: 100,
    WINDOW: 60000, // 1 minute
  },
  HEADERS: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
} as const;

export const EXECUTION_CONFIG = {
  DEFAULT_TIMEOUT: 30000, // 30 seconds
  MAX_TIMEOUT: 300000, // 5 minutes
  DEFAULT_LANGUAGE: "python",
  SUPPORTED_LANGUAGES: ["python", "javascript", "typescript", "shell", "bash"] as const,
  MAX_CODE_LENGTH: 50000, // 50KB
  MAX_OUTPUT_LENGTH: 100000, // 100KB
  HISTORY_LIMIT: 100,
} as const;

export const CACHE_CONFIG = {
  DEFAULT_TTL: 300000, // 5 minutes
  MAX_SIZE: 1000,
  STORAGE_KEYS: {
    SANDBOX_LIST: "daytona:sandbox:list",
    SANDBOX_DETAIL: "daytona:sandbox:detail",
    EXECUTION_HISTORY: "daytona:execution:history",
    USER_PREFERENCES: "daytona:user:preferences",
    FILE_CACHE: "daytona:files:cache",
    GIT_STATUS: "daytona:git:status",
  },
  TTL_BY_TYPE: {
    SANDBOX_LIST: 60000, // 1 minute
    SANDBOX_DETAIL: 30000, // 30 seconds
    EXECUTION_HISTORY: 300000, // 5 minutes
    USER_PREFERENCES: 3600000, // 1 hour
    FILE_CACHE: 60000, // 1 minute
    GIT_STATUS: 30000, // 30 seconds
  },
} as const;
