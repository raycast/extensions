/**
 * Mock service for INPI API using pre-recorded responses
 * Used for CI/CD tests without authentication
 */

import mockedResponses from "../../assets/mocked-api-responses.json";
import { CompanyData } from "../types";

export interface MockedApiResponse {
  siren: string;
  description: string;
  timestamp: string;
  data: CompanyData | null;
  error?: string;
}

export interface MockedDataset {
  metadata: {
    generated: string;
    version: string;
    description: string;
    totalCompanies: number;
    successfulResponses: number;
  };
  responses: MockedApiResponse[];
}

/**
 * Mock service that simulates the INPI API with pre-recorded data
 */
export class INPIApiMock {
  private dataset: MockedDataset;
  private responseDelay: number;

  constructor(responseDelay = 100) {
    this.dataset = mockedResponses as MockedDataset;
    this.responseDelay = responseDelay;
  }

  /**
   * Simulates authentication (always successful in mock mode)
   */
  async login(): Promise<string> {
    await this.simulateDelay();
    return "mock-token-" + Date.now();
  }

  /**
   * Retrieves mocked data for a SIREN
   */
  async getCompanyInfo(siren: string): Promise<CompanyData> {
    await this.simulateDelay();

    // Find the mocked response for this SIREN
    const mockedResponse = this.dataset.responses.find((r) => r.siren === siren);

    if (!mockedResponse) {
      throw new Error(`SIREN ${siren} not found in mocked dataset`);
    }

    if (mockedResponse.error) {
      throw new Error(`Mocked error for SIREN ${siren}: ${mockedResponse.error}`);
    }

    if (!mockedResponse.data) {
      throw new Error(`No data available for SIREN ${siren}`);
    }

    return mockedResponse.data;
  }

  /**
   * Checks if a SIREN is available in the dataset
   */
  isAvailable(siren: string): boolean {
    return this.dataset.responses.some((r) => r.siren === siren && !r.error);
  }

  /**
   * Returns the list of available SIRENs
   */
  getAvailableSirens(): string[] {
    return this.dataset.responses.filter((r) => !r.error).map((r) => r.siren);
  }

  /**
   * Returns the dataset metadata
   */
  getDatasetInfo(): MockedDataset["metadata"] {
    return this.dataset.metadata;
  }

  /**
   * Simulates network delay
   */
  private async simulateDelay(): Promise<void> {
    if (this.responseDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.responseDelay));
    }
  }

  /**
   * Resets the response delay
   */
  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }
}

/**
 * Singleton instance of the mock service
 */
export const inpiApiMock = new INPIApiMock();

/**
 * Utility function to determine whether to use mock or real API
 * Integrates with our comprehensive credential detection system
 */
export function shouldUseMock(): boolean {
  // Force mock if explicitly requested (GitHub Actions)
  if (process.env.FORCE_MOCK === "true") {
    return true;
  }

  // In non-test environment, always use real API
  const isTestEnvironment = process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
  if (!isTestEnvironment) {
    return false;
  }

  // In test environment, use mock only if no real credentials available
  try {
    // Dynamic import to avoid circular dependencies in production
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getTestCredentials } = require("../__tests__/helpers/credentials");
    const credentials = getTestCredentials();
    return credentials.source === "none";
  } catch {
    // Fallback: check environment variables directly
    const hasEnvCredentials = process.env.INPI_USERNAME && process.env.INPI_PASSWORD;
    return !hasEnvCredentials;
  }
}

/**
 * Factory function that returns the appropriate service based on context
 */
export async function createINPIApiService(): Promise<{ getCompanyInfo: (siren: string) => Promise<CompanyData> }> {
  if (shouldUseMock()) {
    console.log("🎭 Using mocked INPI API service");
    return inpiApiMock;
  } else {
    // Dynamic import to avoid dependencies in mock mode
    const { getCompanyInfo } = await import("./inpi-api");
    console.log("🌐 Using real INPI API service");
    return { getCompanyInfo };
  }
}
