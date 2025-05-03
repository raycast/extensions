import axios, { AxiosError, AxiosInstance } from "axios";
import { withRetry } from "../utils/retry";
import { PrusaApiError, ERROR_MESSAGES } from "./errors";
import { logger } from "../utils/logger";
import type { PrinterInfo, PrinterStatus, FileList, JobDetails } from "./types";
import type { PrusaClientConfig } from "./config";
import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  printerIP: string;
  apiKey: string;
  requestTimeout?: string;
}

const DEFAULT_TIMEOUT = 10; // seconds

const DEFAULT_CONFIG: Partial<PrusaClientConfig> = {
  timeout: 10000,
  maxRetries: 3,
  initialRetryDelay: 1000,
  maxRetryDelay: 8000,
};

/**
 * Creates a configured PrusaClient instance based on preferences.
 * Handles preference validation and default values.
 * @returns A configured PrusaClient instance.
 * @throws Error if preferences are invalid.
 */
export function createPrusaClientFromPreferences(): PrusaClient {
  const prefs = getPreferenceValues<Preferences>();

  // Validate preferences
  if (!prefs.printerIP?.trim()) {
    throw new Error("Printer IP address is not configured. Please set it in extension preferences.");
  }
  if (!prefs.apiKey?.trim()) {
    throw new Error("API key is not configured. Please set it in extension preferences.");
  }

  let timeout = DEFAULT_TIMEOUT;
  if (prefs.requestTimeout) {
    const parsedTimeout = parseInt(prefs.requestTimeout);
    if (isNaN(parsedTimeout)) {
      throw new Error("Invalid request timeout value. Please enter a valid number in seconds.");
    }
    timeout = parsedTimeout;
  }

  return new PrusaClient({
    baseURL: `http://${prefs.printerIP.trim()}`,
    apiKey: prefs.apiKey.trim(),
    timeout: timeout * 1000,
  });
}

/**
 * Client for interacting with the Prusa Connect API.
 * Provides methods for retrieving printer status, managing print jobs, and handling files.
 * Includes automatic retry logic for transient failures and comprehensive error handling.
 */
export class PrusaClient {
  private client: AxiosInstance;
  private config: PrusaClientConfig;

  /**
   * Creates a new PrusaClient instance.
   * @param config - Configuration options for the client
   */
  constructor(config: PrusaClientConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        "X-Api-Key": this.config.apiKey,
        Accept: "application/json",
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        logger.error("API Error:", error);

        if (!error.response) {
          throw new PrusaApiError(ERROR_MESSAGES.NETWORK_ERROR, undefined, error.config?.url, true);
        }

        const { status, config: reqConfig } = error.response;
        let message: string;
        let retryable = false;

        switch (status) {
          case 401:
            message = ERROR_MESSAGES.INVALID_AUTH;
            break;
          case 404:
            message = ERROR_MESSAGES.NOT_FOUND;
            break;
          case 429:
            message = ERROR_MESSAGES.RATE_LIMITED;
            retryable = true;
            break;
          case 503:
            message = ERROR_MESSAGES.PRINTER_OFFLINE;
            retryable = true;
            break;
          default:
            message = status >= 500 ? ERROR_MESSAGES.SERVER_ERROR : ERROR_MESSAGES.INVALID_RESPONSE;
            retryable = status >= 500;
        }

        throw new PrusaApiError(message, status, reqConfig?.url, retryable);
      },
    );
  }

  /**
   * Executes a request with automatic retry logic for transient failures.
   * @param operation - Async operation to execute
   * @returns Promise resolving to the operation result
   * @private
   */
  private async request<T>(operation: () => Promise<T>): Promise<T> {
    return withRetry(operation, this.config);
  }

  /**
   * Retrieves basic information about the printer.
   * @returns Promise resolving to printer information
   * @throws {PrusaApiError} If the request fails
   */
  async getPrinterInfo(): Promise<PrinterInfo> {
    return this.request(async () => {
      const response = await this.client.get<PrinterInfo>("/api/v1/info");
      return response.data;
    });
  }

  /**
   * Retrieves the current status of the printer.
   * @returns Promise resolving to printer status
   * @throws {PrusaApiError} If the request fails
   */
  async getStatus(): Promise<PrinterStatus> {
    return this.request(async () => {
      const response = await this.client.get<PrinterStatus>("/api/v1/status");
      return response.data;
    });
  }

  /**
   * Retrieves details about the current print job.
   * @returns Promise resolving to job details
   * @throws {PrusaApiError} If the request fails
   */
  async getJob(): Promise<JobDetails> {
    return this.request(async () => {
      const response = await this.client.get<JobDetails>("/api/v1/job");
      return response.data;
    });
  }

  /**
   * Lists files in a specific storage location and path.
   * @param storage - Storage location (e.g., "usb")
   * @param path - Path to list files from
   * @returns Promise resolving to file list
   * @throws {PrusaApiError} If the request fails
   */
  async listFiles(storage: string, path: string): Promise<FileList> {
    return this.request(async () => {
      const response = await this.client.get<FileList>(`/api/v1/files/${storage}/${path}`);
      return response.data;
    });
  }

  /**
   * Starts printing a file from storage.
   * @param storage - Storage location (e.g., "usb")
   * @param path - Path to the file to print
   * @throws {PrusaApiError} If the request fails
   */
  async startPrint(storage: string, path: string): Promise<void> {
    await this.request(async () => {
      await this.client.post(`/api/v1/files/${storage}/${path}`);
    });
  }

  /**
   * Pauses the current print job.
   * @param jobId - ID of the print job to pause
   * @throws {PrusaApiError} If the request fails
   */
  async pausePrint(jobId: string): Promise<void> {
    await this.request(async () => {
      await this.client.put(`/api/v1/job/${jobId}/pause`);
    });
  }

  /**
   * Resumes a paused print job.
   * @param jobId - ID of the print job to resume
   * @throws {PrusaApiError} If the request fails
   */
  async resumePrint(jobId: string): Promise<void> {
    await this.request(async () => {
      await this.client.put(`/api/v1/job/${jobId}/resume`);
    });
  }

  /**
   * Cancels the current print job.
   * @param jobId - ID of the print job to cancel
   * @throws {PrusaApiError} If the request fails
   */
  async cancelPrint(jobId: string): Promise<void> {
    await this.request(async () => {
      await this.client.delete(`/api/v1/job/${jobId}`);
    });
  }

  /**
   * Deletes a file from storage.
   * @param storage - Storage location (e.g., "usb")
   * @param path - Path to the file to delete
   * @throws {PrusaApiError} If the request fails
   */
  async deleteFile(storage: string, path: string): Promise<void> {
    await this.request(async () => {
      await this.client.delete(`/api/v1/files/${storage}/${path}`);
    });
  }
}
