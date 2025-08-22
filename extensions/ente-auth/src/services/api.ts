import axios, { AxiosInstance, AxiosError } from "axios";
import {
  AuthorizationResponse,
  AuthKey,
  AuthEntity,
  ApiClientConfig,
  AuthenticationContext,
  SRPAttributes,
  CreateSRPSessionResponse,
  SRPVerificationResponse,
} from "../types";
import { getStorageService } from "./storage";

const API_BASE_URL = "https://api.ente.io";

export class EnteApiClient {
  private client: AxiosInstance;
  private authContext?: AuthenticationContext;
  private clientPackage: string;

  constructor(config?: ApiClientConfig) {
    this.clientPackage = config?.clientPackage || "io.ente.cli";

    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: this.getBaseHeaders(config?.token),
    });

    // CRITICAL FIX: Ensure token is set as common header if provided in config
    if (config?.token) {
      this.client.defaults.headers.common["X-Auth-Token"] = config.token;
    }

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        const url = error.config?.url;
        console.error(`API Error on ${url}:`, {
          status: error.response?.status,
          data: error.response?.data,
        });

        if (error.response) {
          switch (error.response.status) {
            case 401:
              error.message = "Authentication failed. Your session may have expired or credentials may be incorrect.";
              break;
            case 404:
              error.message = "The requested resource was not found.";
              break;
            default:
              error.message = "An API error occurred. Please try again later.";
          }
        } else if (error.request) {
          error.message = "Network error. Please check your connection.";
        }
        return Promise.reject(error);
      },
    );
  }

  private getBaseHeaders(token?: string): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "X-Client-Package": this.clientPackage,
      ...(token && { "X-Auth-Token": token }),
    };
  }

  private getAuthenticatedHeaders(token?: string): Record<string, string> {
    const currentToken = token || (this.client.defaults.headers.common["X-Auth-Token"] as string) || "";

    // Match web implementation exactly - only X-Auth-Token and X-Client-Package
    return {
      "X-Auth-Token": currentToken,
      "X-Client-Package": this.clientPackage,
    };
  }

  setAuthenticationContext(context: AuthenticationContext): void {
    this.authContext = context;
  }

  setToken(token: string): void {
    // Validate that the token contains only valid HTTP header characters
    const hasInvalidChars = /[^\x20-\x7E]/.test(token);

    if (hasInvalidChars) {
      console.error("ERROR: Token contains invalid characters for HTTP headers!");
      console.error("ERROR: This will cause API requests to fail.");
      // Don't throw here, let the request fail so we can debug
    }

    this.client.defaults.headers.common["X-Auth-Token"] = token;
  }

  async requestEmailOTP(email: string): Promise<void> {
    await this.client.post("/users/ott", { email, purpose: "login" });
  }

  async verifyEmailOTP(email: string, otp: string): Promise<AuthorizationResponse> {
    const response = await this.client.post("/users/verify-email", { email, ott: otp });
    return response.data;
  }

  // SRP Authentication methods
  async getSRPAttributes(email: string): Promise<SRPAttributes> {
    const response = await this.client.get("/users/srp/attributes", {
      params: { email },
    });
    return response.data.attributes;
  }

  async createSRPSession(srpUserID: string, srpA: string): Promise<CreateSRPSessionResponse> {
    const response = await this.client.post("/users/srp/create-session", {
      srpUserID,
      srpA,
    });
    return response.data;
  }

  async verifySRPSession(srpUserID: string, sessionID: string, srpM1: string): Promise<SRPVerificationResponse> {
    const response = await this.client.post("/users/srp/verify-session", {
      srpUserID,
      sessionID,
      srpM1,
    });
    return response.data;
  }

  async getAuthKey(): Promise<AuthKey> {
    try {
      const response = await this.client.get("/authenticator/key", {
        headers: this.getAuthenticatedHeaders(),
      });
      return response.data;
    } catch (error) {
      if ((error as AxiosError).response?.status === 404) {
        throw new Error("AuthenticatorKeyNotFound");
      }
      throw error;
    }
  }

  async createAuthKey(encryptedKey: string, header: string): Promise<AuthKey> {
    const response = await this.client.post(
      "/authenticator/key",
      { encryptedKey, header },
      {
        headers: this.getAuthenticatedHeaders(),
      },
    );
    return response.data;
  }

  async getAuthDiff(sinceTime = 0, limit = 500): Promise<{ diff: AuthEntity[] }> {
    const response = await this.client.get("/authenticator/entity/diff", {
      params: { sinceTime, limit },
      headers: this.getAuthenticatedHeaders(),
    });

    // 🔍 DETAILED SERVER RESPONSE LOGGING

    if (response.data.diff && Array.isArray(response.data.diff)) {
      response.data.diff.forEach((entity: AuthEntity) => {
        if (entity.encryptedData) {
          // Entity has encrypted data for processing
        }

        if (entity.header) {
          // Entity has header information
        }
      });
    }

    if (response.data.timestamp) {
      // Server returned timestamp for diff response
    }
    return response.data;
  }

  // [+] Add comprehensive API endpoint testing with deeper debugging
  async testTokenValidity(): Promise<boolean> {
    const headers = this.getAuthenticatedHeaders();

    // First test basic token validation endpoints
    const basicEndpoints = [
      { path: "/users/details", name: "User Details", expectedCodes: [200, 404] },
      { path: "/users/session-validity/v2", name: "Session Validity", expectedCodes: [200] },
    ];

    let basicTokenValid = false;
    for (const endpoint of basicEndpoints) {
      try {
        const response = await this.client.get(endpoint.path, { headers });
        if (endpoint.expectedCodes.includes(response.status)) {
          basicTokenValid = true;
        }
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        const status = axiosError?.response?.status;

        // If we get 401 on basic endpoints, token is definitely invalid
        if (status === 401) {
          // Token is invalid, authentication failed
        }
      }
    }

    // Test authenticator endpoints only if basic token is valid
    const authEndpoints = [
      { path: "/authenticator/key", name: "Authenticator Key" },
      { path: "/authenticator/entity/diff?sinceTime=0&limit=1", name: "Authenticator Diff" },
    ];

    let anySuccess = basicTokenValid;
    for (const endpoint of authEndpoints) {
      try {
        await this.client.get(endpoint.path, { headers });
        anySuccess = true;
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        const status = axiosError?.response?.status;

        if (status === 404) {
          // Authenticator endpoint not found (expected for some accounts)
        }
      }
    }
    return anySuccess;
  }
}

let apiClientInstance: EnteApiClient | null = null;

// [+] Add method to reset API client instance with fresh token
export const resetApiClient = (): void => {
  apiClientInstance = null;
};

// [+] Create unauthenticated API client for SRP operations
export const getUnauthenticatedApiClient = (): EnteApiClient => {
  return new EnteApiClient({
    clientPackage: "io.ente.cli",
    // No token - SRP endpoints are public
  });
};

export const getApiClient = async (): Promise<EnteApiClient> => {
  if (apiClientInstance) {
    // Ensure the token is up-to-date on subsequent calls after login
    const storage = getStorageService();
    // First try active token, then fallback to credentials token
    let token = (await storage.getActiveToken()) || undefined;
    if (!token) {
      const creds = await storage.getCredentials();
      token = creds?.token;
    }
    if (token) {
      apiClientInstance.setToken(token);
    }
    return apiClientInstance;
  }

  const storage = getStorageService();
  let token = (await storage.getActiveToken()) || undefined;
  if (!token) {
    const creds = await storage.getCredentials();
    token = creds?.token;
  }
  const authContext = await storage.getAuthenticationContext();

  const config: ApiClientConfig = {
    token,
    clientPackage: "io.ente.cli",
    userId: authContext?.userId,
    accountKey: authContext?.accountKey,
  };

  apiClientInstance = new EnteApiClient(config);

  if (authContext) {
    apiClientInstance.setAuthenticationContext(authContext);
  }

  return apiClientInstance;
};
