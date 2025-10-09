/**
 * Preferences and configuration types
 * Centralized definitions for user preferences and extension settings
 */

export interface Preferences {
  daytonaApiKey: string;
  daytonaUrl?: string;
  defaultLanguage?: string;
  autoSave?: boolean;
  executionTimeout?: number;
  maxExecutionHistory?: number;
  showExecutionTime?: boolean;
  enableNotifications?: boolean;
  debugMode?: boolean;
  theme?: "system" | "light" | "dark";
  compactMode?: boolean;
}

export interface ExtensionSettings {
  // API Configuration
  api: {
    baseUrl: string;
    timeout: number;
    retries: number;
    rateLimit?: {
      requests: number;
      window: number; // in milliseconds
    };
  };

  // Cache Configuration
  cache: {
    enabled: boolean;
    defaultTtl: number;
    maxSize: number;
    persistent: boolean;
  };

  // UI Configuration
  ui: {
    itemsPerPage: number;
    enableVirtualization: boolean;
    animationsEnabled: boolean;
    showAdvancedFeatures: boolean;
    compactMode: boolean;
  };

  // Execution Configuration
  execution: {
    defaultLanguage: string;
    timeout: number;
    maxHistoryItems: number;
    autoSaveHistory: boolean;
    showExecutionTime: boolean;
    enableErrorSuggestions: boolean;
  };

  // Git Configuration
  git: {
    defaultBranch: string;
    autoFetch: boolean;
    showFileChanges: boolean;
    enableCommitValidation: boolean;
    defaultCommitMessage?: string;
  };

  // Sandbox Configuration
  sandbox: {
    defaultImage?: string;
    autoStartOnCreate: boolean;
    autoStopOnExit: boolean;
    persistentMode: boolean;
    resourceLimits?: {
      cpu?: number;
      memory?: number;
      disk?: number;
    };
  };

  // Security Configuration
  security: {
    enableApiKeyValidation: boolean;
    requireConfirmationForDestructive: boolean;
    logLevel: "debug" | "info" | "warn" | "error";
    enableAuditLog: boolean;
  };
}

export interface FeatureFlags {
  enableBetaFeatures: boolean;
  enableExperimentalGit: boolean;
  enableAdvancedExecution: boolean;
  enableSnapshotManagement: boolean;
  enableCollaboration: boolean;
  enablePerformanceMetrics: boolean;
}

export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  avatar?: string;
  preferences: Preferences;
  settings: ExtensionSettings;
  featureFlags: FeatureFlags;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string;
}

export interface ConfigurationSchema {
  preferences: {
    [K in keyof Preferences]: {
      type: "string" | "number" | "boolean" | "select";
      required: boolean;
      default?: Preferences[K];
      description: string;
      options?: Array<{ label: string; value: Preferences[K] }>;
      validation?: {
        min?: number;
        max?: number;
        pattern?: string;
      };
    };
  };
}

export interface SettingsValidationResult {
  valid: boolean;
  errors: Array<{
    key: string;
    message: string;
    value: unknown;
  }>;
  warnings: Array<{
    key: string;
    message: string;
    value: unknown;
  }>;
}

export interface SettingsExport {
  version: string;
  timestamp: string;
  preferences: Preferences;
  settings: ExtensionSettings;
  featureFlags: FeatureFlags;
  metadata: {
    extensionVersion: string;
    platform: string;
    raycastVersion: string;
  };
}

export interface SettingsImportOptions {
  mergeMode: "replace" | "merge" | "selective";
  preserveApiKeys: boolean;
  validateSchema: boolean;
  createBackup: boolean;
}

export interface SettingsManager {
  get<T extends keyof Preferences>(key: T): Preferences[T];
  set<T extends keyof Preferences>(key: T, value: Preferences[T]): void;
  getAll(): Preferences;
  setAll(preferences: Partial<Preferences>): void;
  reset(keys?: Array<keyof Preferences>): void;
  validate(): SettingsValidationResult;
  export(): SettingsExport;
  import(data: SettingsExport, options?: SettingsImportOptions): Promise<void>;
  subscribe(callback: (preferences: Preferences) => void): () => void;
}
