/**
 * Enhanced Daytona API Client
 * Wrapper around existing daytona-client with additional features
 */

import { getDaytonaClient } from "../daytona-client";
import { ApiResponse, ApiRequestOptions, ApiClientConfig } from "../../types/api";
import { API_CONFIG } from "../constants/api";
import { mapErrorToUserFriendly } from "../error-handler";

export class DaytonaApiClient {
  private client: ReturnType<typeof getDaytonaClient> | null = null;
  private config: ApiClientConfig;

  constructor(config?: Partial<ApiClientConfig>) {
    this.config = {
      baseUrl: process.env.DAYTONA_URL || "http://localhost:3000",
      timeout: API_CONFIG.DEFAULT_TIMEOUT,
      retries: API_CONFIG.RETRY_ATTEMPTS,
      headers: { ...API_CONFIG.HEADERS },
      ...config,
    };
  }

  /**
   * Initialize the client
   */
  async initialize(): Promise<void> {
    try {
      this.client = getDaytonaClient();
    } catch (error) {
      throw new Error(`Failed to initialize Daytona client: ${error}`);
    }
  }

  /**
   * Ensure client is initialized
   */
  private async ensureClient(): Promise<ReturnType<typeof getDaytonaClient>> {
    if (!this.client) {
      await this.initialize();
    }
    if (!this.client) {
      throw new Error("Daytona client not available");
    }
    return this.client;
  }

  /**
   * Make a generic API request with retry logic
   */
  private async makeRequest<T>(operation: () => Promise<T>, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const { retries = this.config.retries, timeout = this.config.timeout } = options;

    let lastError: Error;

    for (let attempt = 0; attempt <= retries!; attempt++) {
      try {
        // Set up timeout
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), timeout);
        });

        const result = await Promise.race([operation(), timeoutPromise]);

        return {
          data: result,
          success: true,
          status: 200,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === retries) break;

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    const processedError = mapErrorToUserFriendly(lastError!);
    return {
      success: false,
      status: 500,
      error: processedError.message,
      data: undefined,
    };
  }

  /**
   * List all sandboxes
   */
  async listSandboxes(): Promise<ApiResponse<unknown[]>> {
    const client = await this.ensureClient();
    return this.makeRequest(() => client.list());
  }

  /**
   * Get sandbox by ID
   */
  async getSandbox(id: string): Promise<ApiResponse<unknown>> {
    const client = await this.ensureClient();
    return this.makeRequest(() => client.get(id));
  }

  /**
   * Create a new sandbox
   */
  async createSandbox(
    options: {
      language?: string;
      name?: string;
      repository?: string;
      branch?: string;
      image?: string;
    } = {},
  ): Promise<ApiResponse<unknown>> {
    const client = await this.ensureClient();
    const createParams = {
      language: options.language || ("python" as const),
      ...options,
    };
    return this.makeRequest(() => client.create(createParams));
  }

  /**
   * Start a sandbox
   */
  async startSandbox(id: string): Promise<ApiResponse<void>> {
    const client = await this.ensureClient();
    const sandbox = await client.get(id);
    return this.makeRequest(() => client.start(sandbox));
  }

  /**
   * Stop a sandbox
   */
  async stopSandbox(id: string): Promise<ApiResponse<void>> {
    const client = await this.ensureClient();
    const sandbox = await client.get(id);
    return this.makeRequest(() => client.stop(sandbox));
  }

  /**
   * Delete a sandbox
   */
  async deleteSandbox(id: string): Promise<ApiResponse<void>> {
    const client = await this.ensureClient();
    const sandbox = await client.get(id);
    return this.makeRequest(() => client.delete(sandbox));
  }

  /**
   * Execute code in a sandbox - placeholder method
   */
  async executeCode(): Promise<ApiResponse<unknown>> {
    // Note: Actual implementation depends on Daytona SDK's process execution API
    // Parameters: sandboxId: string, code: string, options: { language?, workingDir?, env?, timeout? }
    throw new Error("Code execution not yet implemented - requires Daytona SDK process API");
  }

  /**
   * List files in sandbox directory - placeholder method
   */
  async listFiles(): Promise<ApiResponse<unknown[]>> {
    // Note: Actual implementation depends on Daytona SDK's file management API
    // Parameters: sandboxId: string, path?: string
    throw new Error("File listing not yet implemented - requires Daytona SDK file API");
  }

  /**
   * Read file content - placeholder method
   */
  async readFile(): Promise<ApiResponse<string>> {
    // Note: Actual implementation depends on Daytona SDK's file management API
    // Parameters: sandboxId: string, path: string
    throw new Error("File reading not yet implemented - requires Daytona SDK file API");
  }

  /**
   * Write file content - placeholder method
   */
  async writeFile(): Promise<ApiResponse<void>> {
    // Note: Actual implementation depends on Daytona SDK's file management API
    // Parameters: sandboxId: string, path: string, content: string
    throw new Error("File writing not yet implemented - requires Daytona SDK file API");
  }

  /**
   * Delete file or directory - placeholder method
   */
  async deleteFile(): Promise<ApiResponse<void>> {
    // Note: Actual implementation depends on Daytona SDK's file management API
    // Parameters: sandboxId: string, path: string
    throw new Error("File deletion not yet implemented - requires Daytona SDK file API");
  }

  /**
   * Run git command in sandbox - placeholder method
   */
  async runGitCommand(): Promise<ApiResponse<unknown>> {
    // Note: Actual implementation depends on Daytona SDK's process execution API
    // Parameters: sandboxId: string, command: string[], workingDir?: string
    throw new Error("Git commands not yet implemented - requires Daytona SDK process API");
  }

  /**
   * List snapshots - placeholder method
   */
  async listSnapshots(): Promise<ApiResponse<unknown[]>> {
    // Note: Actual implementation depends on Daytona SDK's snapshot API
    throw new Error("Snapshot listing not yet implemented - requires Daytona SDK snapshot API");
  }

  /**
   * Create snapshot - placeholder method
   */
  async createSnapshot(): Promise<ApiResponse<unknown>> {
    // Note: Actual implementation depends on Daytona SDK's snapshot API
    // Parameters: sandboxId: string, name: string, description?: string
    throw new Error("Snapshot creation not yet implemented - requires Daytona SDK snapshot API");
  }

  /**
   * Delete snapshot - placeholder method
   */
  async deleteSnapshot(): Promise<ApiResponse<void>> {
    // Note: Actual implementation depends on Daytona SDK's snapshot API
    // Parameters: id: string
    throw new Error("Snapshot deletion not yet implemented - requires Daytona SDK snapshot API");
  }

  /**
   * Check if client is healthy
   */
  async healthCheck(): Promise<ApiResponse<boolean>> {
    try {
      const client = await this.ensureClient();
      // Try a simple operation to check if the client is working
      await client.list();
      return {
        data: true,
        success: true,
        status: 200,
      };
    } catch (error) {
      return {
        data: false,
        success: false,
        status: 500,
        error: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  // NOTE: getExecutionCommand method removed - will be implemented when
  // code execution API is available in Daytona SDK

  /**
   * Update client configuration
   */
  updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ApiClientConfig {
    return { ...this.config };
  }
}

// Export a singleton instance
let apiClientInstance: DaytonaApiClient | null = null;

export function getDaytonaApiClient(): DaytonaApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new DaytonaApiClient();
  }
  return apiClientInstance;
}

export function resetApiClient(): void {
  apiClientInstance = null;
}
