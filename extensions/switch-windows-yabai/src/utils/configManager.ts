/**
 * Advanced configuration management and error recovery system
 * Provides feature flags, performance settings, and error handling
 */

import { storageManager } from "./batchedStorage";

interface PerformanceConfig {
  batchDelay: number;
  cacheTimeout: number;
  yabaiQueryCacheTimeout: number;
  searchCacheTimeout: number;
  maxCacheSize: number;
  workerEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  debounceDelay: number;
}

interface FeatureFlags {
  useSmartCache: boolean;
  useYabaiQueryManager: boolean;
  useBackgroundWorker: boolean;
  useOptimizedSearch: boolean;
  useBatchedStorage: boolean;
  useAsyncApplicationLoader: boolean;
  usePerformanceMonitoring: boolean;
  useVirtualizedLists: boolean;
  useMemoizedComponents: boolean;
}

interface ErrorRecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  fallbackToSync: boolean;
  enableCrashReporting: boolean;
  gracefulDegradation: boolean;
}

export interface AppConfig {
  performance: PerformanceConfig;
  features: FeatureFlags;
  errorRecovery: ErrorRecoveryConfig;
  version: string;
}

const DEFAULT_CONFIG: AppConfig = {
  version: "2.0.0",
  performance: {
    batchDelay: 500,
    cacheTimeout: 30000,
    yabaiQueryCacheTimeout: 2000,
    searchCacheTimeout: 30000,
    maxCacheSize: 50,
    workerEnabled: true,
    performanceMonitoringEnabled: process.env.NODE_ENV === "development",
    debounceDelay: 30,
  },
  features: {
    useSmartCache: true,
    useYabaiQueryManager: true,
    useBackgroundWorker: true,
    useOptimizedSearch: true,
    useBatchedStorage: true,
    useAsyncApplicationLoader: true,
    usePerformanceMonitoring: true,
    useVirtualizedLists: false, // Disabled by default - enable for large datasets
    useMemoizedComponents: true,
  },
  errorRecovery: {
    maxRetries: 3,
    retryDelay: 1000,
    fallbackToSync: true,
    enableCrashReporting: false,
    gracefulDegradation: true,
  },
};

class ConfigManager {
  private config: AppConfig = DEFAULT_CONFIG;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const savedConfig = await storageManager.get<AppConfig>("app-config");

      if (savedConfig && savedConfig.version === DEFAULT_CONFIG.version) {
        // Merge saved config with defaults to handle new properties
        this.config = this.mergeConfigs(DEFAULT_CONFIG, savedConfig);
      } else {
        // Save default config
        await storageManager.set("app-config", DEFAULT_CONFIG);
        this.config = DEFAULT_CONFIG;
      }

      this.initialized = true;
      console.log("📋 Configuration loaded:", this.config);
    } catch (error) {
      console.error("Failed to load configuration, using defaults:", error);
      this.config = DEFAULT_CONFIG;
      this.initialized = true;
    }
  }

  private mergeConfigs(defaultConfig: AppConfig, savedConfig: Partial<AppConfig>): AppConfig {
    return {
      ...defaultConfig,
      performance: { ...defaultConfig.performance, ...savedConfig.performance },
      features: { ...defaultConfig.features, ...savedConfig.features },
      errorRecovery: { ...defaultConfig.errorRecovery, ...savedConfig.errorRecovery },
      version: defaultConfig.version, // Always use current version
    };
  }

  async updateConfig(updates: Partial<AppConfig>): Promise<void> {
    this.config = this.mergeConfigs(this.config, updates);
    await storageManager.set("app-config", this.config);
    console.log("📋 Configuration updated:", updates);
  }

  getConfig(): AppConfig {
    if (!this.initialized) {
      console.warn("Configuration not initialized, using defaults");
      return DEFAULT_CONFIG;
    }
    return this.config;
  }

  isFeatureEnabled(feature: keyof FeatureFlags): boolean {
    return this.config.features[feature];
  }

  getPerformanceSetting<K extends keyof PerformanceConfig>(key: K): PerformanceConfig[K] {
    return this.config.performance[key];
  }

  getErrorRecoverySetting<K extends keyof ErrorRecoveryConfig>(key: K): ErrorRecoveryConfig[K] {
    return this.config.errorRecovery[key];
  }

  async resetToDefaults(): Promise<void> {
    this.config = DEFAULT_CONFIG;
    await storageManager.set("app-config", DEFAULT_CONFIG);
    console.log("📋 Configuration reset to defaults");
  }

  // Performance optimization based on system capabilities
  async optimizeForSystem(): Promise<void> {
    const updates: Partial<AppConfig> = {};

    // Detect system capabilities and adjust settings
    if (typeof Worker === "undefined") {
      updates.features = { ...this.config.features, useBackgroundWorker: false };
      console.log("🔧 Disabled web workers (not supported)");
    }

    if (typeof performance.memory !== "undefined") {
      const memoryMB = performance.memory.usedJSHeapSize / 1024 / 1024;

      if (memoryMB > 100) {
        // High memory usage - optimize for memory
        updates.performance = {
          ...this.config.performance,
          maxCacheSize: 25,
          cacheTimeout: 15000,
          batchDelay: 1000,
        };
        console.log("🔧 Optimized for high memory usage");
      } else if (memoryMB < 30) {
        // Low memory usage - optimize for performance
        updates.performance = {
          ...this.config.performance,
          maxCacheSize: 100,
          cacheTimeout: 60000,
          batchDelay: 250,
        };
        console.log("🔧 Optimized for performance");
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.updateConfig(updates);
    }
  }

  // Feature flag helpers
  shouldUseFeature(feature: keyof FeatureFlags, fallback: boolean = false): boolean {
    try {
      return this.isFeatureEnabled(feature);
    } catch {
      console.warn(`Error checking feature ${feature}, using fallback:`, fallback);
      return fallback;
    }
  }
}

// Error recovery utilities
export class ErrorRecoveryManager {
  private retryAttempts = new Map<string, number>();

  constructor(private configManager: ConfigManager) {}

  async withRetry<T>(operation: () => Promise<T>, operationId: string, fallback?: () => T | Promise<T>): Promise<T> {
    const config = this.configManager.getErrorRecoverySetting("maxRetries");
    const retryDelay = this.configManager.getErrorRecoverySetting("retryDelay");
    const currentAttempts = this.retryAttempts.get(operationId) || 0;

    try {
      const result = await operation();
      // Success - reset retry counter
      this.retryAttempts.delete(operationId);
      return result;
    } catch (error) {
      console.error(`Operation ${operationId} failed (attempt ${currentAttempts + 1}):`, error);

      if (currentAttempts < config) {
        // Retry with exponential backoff
        this.retryAttempts.set(operationId, currentAttempts + 1);
        const delay = retryDelay * Math.pow(2, currentAttempts);

        console.log(`Retrying ${operationId} in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.withRetry(operation, operationId, fallback);
      } else {
        // Max retries reached - use fallback or throw
        this.retryAttempts.delete(operationId);

        if (fallback) {
          console.log(`Using fallback for ${operationId}`);
          return await fallback();
        } else {
          throw error;
        }
      }
    }
  }

  reportError(error: Error, context: string): void {
    const enableReporting = this.configManager.getErrorRecoverySetting("enableCrashReporting");

    if (enableReporting) {
      console.error(`🚨 Error in ${context}:`, {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        context,
      });
    }
  }

  shouldFallbackToSync(error: Error): boolean {
    const fallbackEnabled = this.configManager.getErrorRecoverySetting("fallbackToSync");
    const gracefulDegradation = this.configManager.getErrorRecoverySetting("gracefulDegradation");

    if (!fallbackEnabled) return false;

    // Check for specific error types that warrant sync fallback
    const syncFallbackErrors = ["Worker error", "Promise timeout", "Async operation failed", "Network error"];

    return gracefulDegradation && syncFallbackErrors.some((errorType) => error.message.includes(errorType));
  }
}

// Singleton instances
export const configManager = new ConfigManager();
export const errorRecoveryManager = new ErrorRecoveryManager(configManager);

// Initialize on module load
configManager.initialize().catch((error) => {
  console.error("Failed to initialize config manager:", error);
});

// Auto-optimize for system after a delay
setTimeout(() => {
  configManager.optimizeForSystem().catch((error) => {
    console.error("Failed to optimize configuration for system:", error);
  });
}, 5000);
