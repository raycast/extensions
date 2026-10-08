/**
 * Configuration options for the PrusaClient.
 */
export interface PrusaClientConfig {
  /** Base URL for the API (e.g., http://192.168.1.100) */
  baseURL: string;
  /** API key for authentication */
  apiKey: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay between retries in milliseconds */
  initialRetryDelay?: number;
  /** Maximum delay between retries in milliseconds */
  maxRetryDelay?: number;
}
