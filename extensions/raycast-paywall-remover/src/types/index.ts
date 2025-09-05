// Type definitions for the Raycast Paywall Remover extension

/**
 * User preferences for the extension
 * Requirement 3.2: User can configure custom paywall removal service URL
 */
export interface Preferences {
  paywallServiceUrl: string;
  defaultBrowser?: string;
}

/**
 * Result of URL processing operation
 * Requirement 4.3: Clear feedback about paywall removal process
 */
export interface UrlProcessingResult {
  originalUrl: string;
  processedUrl: string;
  success: boolean;
  error?: string;
}

/**
 * State management for command execution
 * Requirement 4.3: Loading indicators and process feedback
 */
export interface CommandState {
  isLoading: boolean;
  currentUrl?: string;
  error?: string;
  result?: UrlProcessingResult;
}

/**
 * Error response structure with categorization
 * Requirement 4.3: Clear error messages with specific reasons
 */
export interface ErrorResponse {
  type: "validation" | "network" | "configuration" | "browser" | "clipboard" | "service" | "timeout";
  message: string;
  suggestion?: string;
}

/**
 * URL processor interface for handling URL extraction and validation
 * Requirements 5.1: Handle various URL formats and edge cases
 */
export interface UrlProcessor {
  extractFromClipboard(): Promise<string | null>;
  getCurrentTabUrl(): Promise<string | null>;
  validateUrl(url: string): boolean;
  formatForService(url: string, serviceUrl: string): string;
}

/**
 * Paywall service client interface
 * Requirement 3.2: Integration with configurable paywall removal service
 */
export interface PaywallService {
  removePaywall(targetUrl: string): Promise<string>;
  validateServiceUrl(serviceUrl: string): boolean;
}

/**
 * Browser integration interface for tab URL extraction
 * Requirement 3.2: Support for current browser tab URL processing
 */
export interface BrowserIntegration {
  getActiveTabUrl(): Promise<string | null>;
  openUrl(url: string): Promise<void>;
  getSupportedBrowsers(): string[];
}

/**
 * Clipboard manager interface for URL detection
 * Requirement 5.1: Handle clipboard URL extraction with validation
 */
export interface ClipboardManager {
  getClipboardContent(): Promise<string>;
  extractUrls(content: string): string[];
  hasValidUrl(): Promise<boolean>;
}

// Utility types for URL validation and processing

/**
 * URL validation result with detailed information
 * Requirement 5.1: Proper URL format validation
 */
export type UrlValidationResult = {
  isValid: boolean;
  url?: string;
  error?: string;
  type?: "http" | "https" | "invalid";
};

/**
 * Service URL configuration validation
 * Requirement 3.2: Validate paywall service URL format
 */
export type ServiceUrlValidation = {
  isValid: boolean;
  normalizedUrl?: string;
  error?: string;
  supportsPattern?: boolean;
};

/**
 * Command execution context
 * Requirement 4.3: Context for command state management
 */
export type CommandContext = {
  preferences: Preferences;
  source: "clipboard" | "current-tab";
  startTime: number;
};

/**
 * Processing options for URL handling
 * Requirement 5.1: Configuration for URL processing behavior
 */
export type ProcessingOptions = {
  validateUrl?: boolean;
  encodeUrl?: boolean;
  timeout?: number;
  retryCount?: number;
};

/**
 * Error types for specific error categorization
 * Requirement 4.3: Specific error handling categories
 */
export type ErrorType = "validation" | "network" | "configuration" | "browser" | "service" | "clipboard" | "timeout";

/**
 * Success callback type for command completion
 */
export type SuccessCallback = (result: UrlProcessingResult) => void;

/**
 * Error callback type for command failure handling
 */
export type ErrorCallback = (error: ErrorResponse) => void;
