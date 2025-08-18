import { getPreferenceValues } from "@raycast/api";
import crypto from "crypto";

// Types
import type { AuthGetTokenResponse, AuthGetSessionResponse, AuthErrorResponse } from "@/types/AuthResponse";

interface AuthResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface UserInfoErrorResponse {
  error: number;
  message: string;
}

const API_ROOT = "https://ws.audioscrobbler.com/2.0/";
const API_FORMAT = "json";

// Get API key from preferences
const { apikey: API_KEY, apisecret: API_SECRET } = getPreferenceValues();

/**
 * Generate an MD5 hash of the parameters
 */
function generateApiSignature(params: Record<string, string>): string {
  // Create a new object without format and callback parameters
  const filteredParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "format" && key !== "callback"),
  );

  // Sort parameters alphabetically by key
  const sortedKeys = Object.keys(filteredParams).sort();

  // Build signature string exactly as per documentation: <n><value>
  let signatureString = sortedKeys.map((key) => `${key}${filteredParams[key]}`).join("");

  // Append secret
  signatureString += API_SECRET;

  // Create md5 hash
  return crypto.createHash("md5").update(signatureString).digest("hex");
}

/**
 * Get an authentication token from Last.fm
 */
export async function getAuthToken(): Promise<AuthResponse<string>> {
  try {
    if (!API_KEY || !API_SECRET) {
      return {
        success: false,
        error:
          "Missing Last.fm API credentials. Please set your API key and secret in the extension preferences (Last.fm → Preferences).",
      };
    }
    // Parameters for API signature generation (excluding format)
    const paramsForSig: Record<string, string> = {
      method: "auth.getToken",
      api_key: API_KEY,
    };

    // Generate API signature
    const api_sig = generateApiSignature(paramsForSig);

    // Full parameters for the API call (including signature and format)
    const fullParams = new URLSearchParams({
      ...paramsForSig, // method, api_key
      api_sig: api_sig,
      format: API_FORMAT,
    });

    const response = await fetch(`${API_ROOT}?${fullParams.toString()}`);

    const data = (await response.json()) as AuthGetTokenResponse | AuthErrorResponse;

    if ("error" in data) {
      return {
        success: false,
        error: data.message,
      };
    }

    return {
      success: true,
      data: data.token,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Get a session key using an authenticated token
 */
export async function getSession(token: string): Promise<AuthResponse<string>> {
  try {
    if (!API_KEY || !API_SECRET) {
      return {
        success: false,
        error:
          "Missing Last.fm API credentials. Please set your API key and secret in the extension preferences (Last.fm → Preferences).",
      };
    }
    // Create parameters object without format first (for signature generation)
    const params: Record<string, string> = {
      method: "auth.getSession",
      api_key: API_KEY,
      token: token,
    };

    // Generate signature before adding format parameter
    const api_sig = generateApiSignature(params);

    // Add all parameters including signature and format
    const fullParams = new URLSearchParams({
      ...params,
      api_sig: api_sig,
      format: API_FORMAT,
    });

    // Make the request
    const response = await fetch(`${API_ROOT}?${fullParams.toString()}`);
    const data = (await response.json()) as AuthGetSessionResponse | AuthErrorResponse;

    if ("error" in data) {
      console.error("Last.fm API Error:", {
        error: data.error,
        message: data.message,
        parameters: params,
      });
      return {
        success: false,
        error: data.message,
      };
    }

    return {
      success: true,
      data: data.session.key,
    };
  } catch (error) {
    console.error("Session retrieval error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Validate a session key by making a test API call
 * We use user.getInfo as it's a lightweight call that requires authentication
 */
export async function validateSessionKey(sessionKey: string): Promise<boolean> {
  try {
    if (!API_KEY || !API_SECRET) {
      return false;
    }
    const params: Record<string, string> = {
      method: "user.getInfo",
      api_key: API_KEY,
      sk: sessionKey,
    };

    const api_sig = generateApiSignature(params);
    const fullParams = new URLSearchParams({
      ...params,
      api_sig: api_sig,
      format: API_FORMAT,
    });

    const response = await fetch(`${API_ROOT}?${fullParams.toString()}`);
    const data = (await response.json()) as UserInfoErrorResponse;

    // If we get an error about invalid session key or auth failure, the key is invalid
    if ("error" in data && (data.error === 9 || data.error === 4)) {
      return false;
    }

    // If we get a successful response or any other error, the key is valid
    return true;
  } catch (error) {
    // On network errors, we assume the key might still be valid
    console.error("Session validation error:", error);
    return true;
  }
}
