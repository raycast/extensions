import { LocalStorage, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { API_ENDPOINTS } from "./config";
import { logger } from "./logger";

const TOKEN_KEY = "rewiser_token";
const USER_NAME_KEY = "rewiser_user_name";
const USER_EMAIL_KEY = "rewiser_user_email";

export interface UserInfo {
  name?: string;
  email?: string;
}

export interface AuthResponse {
  name?: string;
  email?: string;
  isValid: boolean;
}

export class AuthenticationError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export async function getValidToken(): Promise<string> {
  try {
    const token = await LocalStorage.getItem<string>(TOKEN_KEY);
    if (!token) {
      throw new AuthenticationError("No authentication token found", "NO_TOKEN");
    }
    return token;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError("Authentication required", "AUTH_REQUIRED");
  }
}

export async function saveToken(token: string): Promise<void> {
  if (!token?.trim()) {
    throw new AuthenticationError("Token cannot be empty", "INVALID_TOKEN");
  }

  try {
    await LocalStorage.setItem(TOKEN_KEY, token);
  } catch {
    await showFailureToast("Failed to save authentication token");
    throw new AuthenticationError("Failed to save token", "STORAGE_ERROR");
  }
}

export async function clearToken(): Promise<void> {
  try {
    // Remove all authentication-related items
    const itemsToRemove = [TOKEN_KEY, USER_NAME_KEY, USER_EMAIL_KEY];
    await Promise.all(itemsToRemove.map((key) => LocalStorage.removeItem(key)));

    await showToast({
      style: Toast.Style.Success,
      title: "Signed Out",
      message: "Authentication cleared successfully",
    });
  } catch {
    await showFailureToast("Failed to clear authentication");
    throw new AuthenticationError("Failed to clear authentication", "CLEAR_ERROR");
  }
}

export async function getUserInfo(): Promise<UserInfo> {
  try {
    const [name, email] = await Promise.all([
      LocalStorage.getItem<string>(USER_NAME_KEY),
      LocalStorage.getItem<string>(USER_EMAIL_KEY),
    ]);

    return {
      name: name || undefined,
      email: email || undefined,
    };
  } catch (error) {
    logger.error("Failed to get user info", error);
    return {};
  }
}

export async function saveUserInfo(userInfo: UserInfo): Promise<void> {
  try {
    const promises: Promise<void>[] = [];

    if (userInfo.name) {
      promises.push(LocalStorage.setItem(USER_NAME_KEY, userInfo.name));
    }
    if (userInfo.email) {
      promises.push(LocalStorage.setItem(USER_EMAIL_KEY, userInfo.email));
    }

    await Promise.all(promises);
  } catch (error) {
    logger.error("Failed to save user info", error);
    throw new AuthenticationError("Failed to save user information", "SAVE_USER_ERROR");
  }
}

export async function isTokenValid(token: string): Promise<boolean> {
  if (!token?.trim()) {
    return false;
  }

  try {
    const response = await fetch(API_ENDPOINTS.VERIFY_AUTH, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    return response.ok;
  } catch (error) {
    logger.error("Token validation failed", error);
    return false;
  }
}

export async function verifyAndSaveToken(token: string): Promise<AuthResponse> {
  if (!token?.trim()) {
    throw new AuthenticationError("Token cannot be empty", "INVALID_TOKEN");
  }

  try {
    const response = await fetch(API_ENDPOINTS.VERIFY_AUTH, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new AuthenticationError(`Authentication failed: ${errorText}`, "AUTH_FAILED");
    }

    const userData = (await response.json()) as { name?: string; email?: string };

    // Save token and user info
    await saveToken(token);
    await saveUserInfo(userData);

    return {
      ...userData,
      isValid: true,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError(`Network error: ${error}`, "NETWORK_ERROR");
  }
}
