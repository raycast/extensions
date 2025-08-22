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
      console.log("DEBUG: 🔧 Setting token in constructor as common header");
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
    console.log("DEBUG: Setting authentication context", {
      userId: context.userId,
      accountKey: context.accountKey ? context.accountKey.substring(0, 20) + "..." : "none",
      userAgent: context.userAgent,
    });
    this.authContext = context;
  }

  setToken(token: string): void {
    console.log("DEBUG: Setting token in API client headers");
    console.log("DEBUG: Token length:", token.length);
    console.log("DEBUG: Token preview:", token.substring(0, 20) + "...");

    // Validate that the token contains only valid HTTP header characters
    const hasInvalidChars = /[^\x20-\x7E]/.test(token);
    console.log("DEBUG: Token contains invalid HTTP header chars:", hasInvalidChars);

    if (hasInvalidChars) {
      console.error("ERROR: Token contains invalid characters for HTTP headers!");
      console.error("ERROR: This will cause API requests to fail.");
      // Don't throw here, let the request fail so we can debug
    }

    this.client.defaults.headers.common["X-Auth-Token"] = token;
    console.log("DEBUG: Token successfully set in API client headers");
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
    console.log("DEBUG: Getting SRP attributes for email:", email);
    const response = await this.client.get("/users/srp/attributes", {
      params: { email },
    });
    console.log("DEBUG: SRP attributes received:", {
      srpUserID: response.data.attributes.srpUserID,
      isEmailMFAEnabled: response.data.attributes.isEmailMFAEnabled,
    });
    return response.data.attributes;
  }

  async createSRPSession(srpUserID: string, srpA: string): Promise<CreateSRPSessionResponse> {
    console.log("DEBUG: Creating SRP session", {
      srpUserID,
      srpA: srpA.substring(0, 20) + "...",
    });
    const response = await this.client.post("/users/srp/create-session", {
      srpUserID,
      srpA,
    });
    console.log("DEBUG: SRP session created:", {
      sessionID: response.data.sessionID,
      srpB: response.data.srpB.substring(0, 20) + "...",
    });
    return response.data;
  }

  async verifySRPSession(srpUserID: string, sessionID: string, srpM1: string): Promise<SRPVerificationResponse> {
    console.log("DEBUG: Verifying SRP session", {
      srpUserID,
      sessionID,
      srpM1: srpM1.substring(0, 20) + "...",
    });
    const response = await this.client.post("/users/srp/verify-session", {
      srpUserID,
      sessionID,
      srpM1,
    });
    console.log("DEBUG: SRP session verified successfully, got srpM2");
    return response.data;
  }

  async getAuthKey(): Promise<AuthKey> {
    try {
      console.log("DEBUG: Making request to /authenticator/key with context:", {
        hasAuthContext: !!this.authContext,
        userId: this.authContext?.userId,
        clientPackage: this.clientPackage,
      });

      const response = await this.client.get("/authenticator/key", {
        headers: this.getAuthenticatedHeaders(),
      });

      console.log("DEBUG: Successfully retrieved auth key, userID:", response.data.userID);
      return response.data;
    } catch (error) {
      console.log("DEBUG: getAuthKey failed", {
        status: (error as AxiosError).response?.status,
        data: (error as AxiosError).response?.data,
        headers: (error as AxiosError).config?.headers,
      });

      if ((error as AxiosError).response?.status === 404) {
        throw new Error("AuthenticatorKeyNotFound");
      }
      throw error;
    }
  }

  async createAuthKey(encryptedKey: string, header: string): Promise<AuthKey> {
    console.log("DEBUG: Creating auth key with enhanced headers");
    const response = await this.client.post(
      "/authenticator/key",
      { encryptedKey, header },
      {
        headers: this.getAuthenticatedHeaders(),
      },
    );
    console.log("DEBUG: Successfully created auth key, userID:", response.data.userID);
    return response.data;
  }

  async getAuthDiff(sinceTime = 0, limit = 500): Promise<{ diff: AuthEntity[] }> {
    console.log("DEBUG: Getting auth diff with enhanced headers", { sinceTime, limit });
    const response = await this.client.get("/authenticator/entity/diff", {
      params: { sinceTime, limit },
      headers: this.getAuthenticatedHeaders(),
    });

    // 🔍 DETAILED SERVER RESPONSE LOGGING
    console.log("=== RAW SERVER RESPONSE FROM /authenticator/entity/diff ===");
    console.log("Status:", response.status);
    console.log("Headers:", JSON.stringify(response.headers, null, 2));
    console.log("Full Response Data:", JSON.stringify(response.data, null, 2));

    if (response.data.diff && Array.isArray(response.data.diff)) {
      console.log(`\n=== INDIVIDUAL ENTITY BREAKDOWN (${response.data.diff.length} entities) ===`);
      response.data.diff.forEach((entity: AuthEntity, index: number) => {
        console.log(`\n--- Entity ${index + 1}/${response.data.diff.length} ---`);
        console.log("ID:", entity.id);
        console.log("isDeleted:", entity.isDeleted);
        console.log("createdAt:", entity.createdAt, new Date(entity.createdAt).toISOString());
        console.log("updatedAt:", entity.updatedAt, new Date(entity.updatedAt).toISOString());
        console.log("hasEncryptedData:", !!entity.encryptedData);
        console.log("hasHeader:", !!entity.header);

        if (entity.encryptedData) {
          console.log("encryptedData length:", entity.encryptedData.length);
          console.log("encryptedData preview:", entity.encryptedData.substring(0, 100) + "...");
        }

        if (entity.header) {
          console.log("header length:", entity.header.length);
          console.log("header preview:", entity.header.substring(0, 50) + "...");
        }
      });
    }

    if (response.data.timestamp) {
      console.log("\n=== SERVER TIMESTAMP INFO ===");
      console.log("Server timestamp (microseconds):", response.data.timestamp);
      console.log("Server timestamp (milliseconds):", Math.floor(response.data.timestamp / 1000));
      console.log("Server timestamp (Date):", new Date(Math.floor(response.data.timestamp / 1000)).toISOString());
      console.log("Client time now:", new Date().toISOString());
    }

    console.log("=== END SERVER RESPONSE DETAILS ===\n");
    console.log("DEBUG: Successfully retrieved auth diff, entities count:", response.data.diff.length);
    return response.data;
  }

  // [+] Add comprehensive API endpoint testing with deeper debugging
  async testTokenValidity(): Promise<boolean> {
    const headers = this.getAuthenticatedHeaders();
    console.log("DEBUG: Starting comprehensive API endpoint testing...");
    console.log("DEBUG: Using headers:", {
      "X-Auth-Token": headers["X-Auth-Token"] ? headers["X-Auth-Token"].substring(0, 20) + "..." : "none",
      "X-Client-Package": headers["X-Client-Package"],
    });

    // First test basic token validation endpoints
    const basicEndpoints = [
      { path: "/users/details", name: "User Details", expectedCodes: [200, 404] },
      { path: "/users/session-validity/v2", name: "Session Validity", expectedCodes: [200] },
    ];

    let basicTokenValid = false;
    for (const endpoint of basicEndpoints) {
      try {
        console.log(`DEBUG: Testing ${endpoint.name} (${endpoint.path})`);
        const response = await this.client.get(endpoint.path, { headers });
        console.log(`DEBUG: ✅ ${endpoint.name} - SUCCESS (${response.status})`);
        if (endpoint.expectedCodes.includes(response.status)) {
          basicTokenValid = true;
        }
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        const status = axiosError?.response?.status;
        const data = axiosError?.response?.data;
        console.log(`DEBUG: ❌ ${endpoint.name} - FAILED (${status}):`, data);

        // If we get 401 on basic endpoints, token is definitely invalid
        if (status === 401) {
          console.log("DEBUG: 🚨 CRITICAL: Basic token validation failed with 401");
          console.log("DEBUG: This indicates the token itself is invalid or expired");
          console.log("DEBUG: Full token:", headers["X-Auth-Token"]);
          console.log("DEBUG: Token bytes:", Array.from(new TextEncoder().encode(headers["X-Auth-Token"] || "")));
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
        console.log(`DEBUG: Testing ${endpoint.name} (${endpoint.path})`);
        const response = await this.client.get(endpoint.path, { headers });
        console.log(`DEBUG: ✅ ${endpoint.name} - SUCCESS (${response.status})`);
        anySuccess = true;
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        const status = axiosError?.response?.status;
        const data = axiosError?.response?.data;
        console.log(`DEBUG: ❌ ${endpoint.name} - FAILED (${status}):`, data);

        if (status === 404) {
          console.log(
            `DEBUG: 📝 ${endpoint.name} returned 404 - might be expected if no authenticator data exists yet`,
          );
        }
      }
    }

    console.log(`DEBUG: Token validation summary - Basic valid: ${basicTokenValid}, Any success: ${anySuccess}`);
    return anySuccess;
  }
}

let apiClientInstance: EnteApiClient | null = null;

// [+] Add method to reset API client instance with fresh token
export const resetApiClient = (): void => {
  console.log("DEBUG: 🔄 Resetting API client instance to clear cached token");
  apiClientInstance = null;
};

// [+] Create unauthenticated API client for SRP operations
export const getUnauthenticatedApiClient = (): EnteApiClient => {
  console.log("DEBUG: 🔓 Creating unauthenticated API client for SRP operations");
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
      console.log("DEBUG: 🔄 Updating existing API client with token:", token.substring(0, 20) + "...");
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

  console.log(
    "DEBUG: 🆕 Creating new API client instance with token:",
    token ? token.substring(0, 20) + "..." : "none",
  );

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
