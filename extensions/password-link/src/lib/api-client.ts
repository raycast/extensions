import { getPasswordLinkConfig } from "./config";
import {
  ApiResponse,
  Secret,
  SecretDetails,
  CreateSecretRequest,
  SecretRequest,
  CreateSecretRequestRequest,
  ListSecretsParams,
  ListSecretRequestsParams,
  ApiError,
} from "../types";

/**
 * Password.link API Client
 * Handles all API interactions with proper error handling
 */
export class PasswordLinkApiClient {
  private config = getPasswordLinkConfig();

  /**
   * Make authenticated API request
   * @param endpoint - API endpoint path
   * @param options - Request options
   * @param usePrivateKey - Whether to use private key (default: true)
   * @returns Promise with API response
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}, usePrivateKey = true): Promise<T> {
    const url = `${this.config.baseUrl}/api${endpoint}`;
    const key = usePrivateKey ? this.config.privateKey : this.config.publicKey;

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `ApiKey ${key}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = (await response.json().catch(() => ({}))) as { error?: ApiError };
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  /**
   * Create a new secret
   * @param secretData - Secret data to create
   * @returns Promise with created secret response
   */
  async createSecret(secretData: CreateSecretRequest): Promise<ApiResponse<Secret>> {
    return this.makeRequest<ApiResponse<Secret>>("/secrets", {
      method: "POST",
      body: JSON.stringify(secretData),
    });
  }

  /**
   * Get secret details (requires public key)
   * @param id - Secret ID
   * @returns Promise with secret details
   */
  async getSecret(id: string): Promise<ApiResponse<SecretDetails>> {
    return this.makeRequest<ApiResponse<SecretDetails>>(`/secrets/${id}`, {}, false);
  }

  /**
   * List all secrets
   * @param params - Optional pagination parameters
   * @returns Promise with list of secrets
   */
  async listSecrets(params?: ListSecretsParams): Promise<ApiResponse<Secret[]>> {
    const queryParams = params?.offset ? `?offset=${params.offset}` : "";
    return this.makeRequest<ApiResponse<Secret[]>>(`/secrets${queryParams}`);
  }

  /**
   * Delete a secret
   * @param id - Secret ID to delete
   * @returns Promise with deletion response
   */
  async deleteSecret(id: string): Promise<ApiResponse<null>> {
    return this.makeRequest<ApiResponse<null>>(`/secrets/${id}`, {
      method: "DELETE",
    });
  }

  /**
   * Create a secret request
   * @param requestData - Secret request data
   * @returns Promise with created secret request response
   */
  async createSecretRequest(requestData: CreateSecretRequestRequest): Promise<ApiResponse<{ id: string }>> {
    return this.makeRequest<ApiResponse<{ id: string }>>("/secret_requests", {
      method: "POST",
      body: JSON.stringify(requestData),
    });
  }

  /**
   * List all secret requests
   * @param params - Optional pagination parameters
   * @returns Promise with list of secret requests
   */
  async listSecretRequests(params?: ListSecretRequestsParams): Promise<ApiResponse<SecretRequest[]>> {
    const queryParams = params?.offset ? `?offset=${params.offset}` : "";
    return this.makeRequest<ApiResponse<SecretRequest[]>>(`/secret_requests${queryParams}`);
  }

  /**
   * Delete a secret request
   * @param id - Secret request ID to delete
   * @returns Promise with deletion response
   */
  async deleteSecretRequest(id: string): Promise<ApiResponse<null>> {
    return this.makeRequest<ApiResponse<null>>(`/secret_requests/${id}`, {
      method: "DELETE",
    });
  }
}

/**
 * Global API client instance
 */
export const apiClient = new PasswordLinkApiClient();
