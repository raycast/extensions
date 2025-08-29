// utils/auth.ts - Refactored

import Parse from "parse/node.js";
import {
  LocalStorage,
  getPreferenceValues,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { clearUserData } from "./userHelpers";
import { buildApiUrl, API_ENDPOINTS } from "./env";

// Constants
const SESSION_TOKEN_KEY = "webbites_session_token";
const USER_DATA_KEY = "webbites_user_data";


/**
 * Check if user is currently logged in
 * @returns Promise resolving to boolean indicating login status
 */
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    // Check if we have a session token
    const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      return false;
    }

    // Check if we have stored user data
    const userDataString = await LocalStorage.getItem<string>(USER_DATA_KEY);
    if (!userDataString) {
      return false;
    }

    // We have both token and user data - consider the user logged in
    return true;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
};

/**
 * Login with username and password using backend API
 * @param username User's email or username
 * @param password User's password
 * @returns Promise resolving to the Parse.User
 */
export const login = async (
  username: string,
  password: string,
): Promise<Parse.User> => {
  try {
    // Call backend API for login
    const response = await fetch(buildApiUrl(API_ENDPOINTS.LOGIN), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Login failed" }));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const loginData = await response.json();

    if (!loginData.success) {
      throw new Error(loginData.message || "Login failed");
    }

    // Create a Parse.User-like object from the response
    const user = new Parse.User();
    user.id = loginData.user.id;
    user.set("username", loginData.user.username);
    user.set("email", loginData.user.email);
    // Set session token using Parse's internal method
    (user as any)._sessionToken = loginData.sessionToken;

    try {
      const isFirstLogin = await LocalStorage.getItem<string>("is_first_login");
      if (isFirstLogin == undefined || isFirstLogin == "true") {
        showToast({
          title: "Logged in",
          message: "Successfully logged in, loading your bookmarks...",
          style: Toast.Style.Success,
        });
        await LocalStorage.setItem("is_first_login", "false");
      }
    } catch (error) {
      console.error("Error checking isFirstLogin:", error);
    }

    // Store session token and user data
    await storeAuthDataFromBackend(loginData);

    return user;
  } catch (error) {
    console.error("Login error:", error);
    clearUserData();
    showFailureToast(error, { title: "Login failed" });
    throw new Error(`Login failed: ${(error as Error).message}`);
  }
};

/**
 * Store authentication data from backend API response
 * @param loginData Backend API response data
 */
async function storeAuthDataFromBackend(loginData: {
  sessionToken: string;
  user: { id: string; username: string; email: string };
}): Promise<void> {
  // Store session token
  await LocalStorage.setItem(SESSION_TOKEN_KEY, loginData.sessionToken);

  // Store user data
  const userData = {
    objectId: loginData.user.id,
    username: loginData.user.username,
    email: loginData.user.email,
    createdAt: new Date(), // Use current date since backend doesn't provide it
  };
  await LocalStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
}

/**
 * Get stored session token
 * @returns Promise resolving to session token or null
 */
export const getSessionToken = async (): Promise<string | null> => {
  const token = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
  return token ?? null;
};

/**
 * Logout the current user using backend API
 */
export const logout = async (): Promise<void> => {
  try {
    // Get the session token first
    const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);

    // Perform server-side logout if we have a token
    if (sessionToken) {
      try {
        // Call backend API for logout
        await fetch(buildApiUrl(API_ENDPOINTS.LOGOUT), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${sessionToken}`,
          },
        });
      } catch (logoutError) {
        console.error("Backend logout error:", logoutError);
        // Continue with local cleanup even if backend logout fails
      }
    }

    // Clear local storage
    await LocalStorage.removeItem(SESSION_TOKEN_KEY);
    await LocalStorage.removeItem(USER_DATA_KEY);

    await showToast({
      style: Toast.Style.Success,
      title: "One last step",
      message: "Please clear your credentials in the preferences screen",
    });

    await openExtensionPreferences();
  } catch (error) {
    console.error("Logout error:", error);

    // Even if server-side logout fails, clear local storage
    await LocalStorage.removeItem(SESSION_TOKEN_KEY);
    await LocalStorage.removeItem(USER_DATA_KEY);

    throw new Error(`Logout failed: ${(error as Error).message}`);
  }
};

/**
 * Get current user using backend API
 * @returns Promise resolving to Parse.User or null
 */
export const getCurrentUser = async (): Promise<Parse.User | null> => {
  try {
    // Check if we have stored user data
    const userDataString = await LocalStorage.getItem<string>(USER_DATA_KEY);
    if (!userDataString) {
      return null;
    }

    // Parse the user data
    let userData;
    try {
      userData = JSON.parse(userDataString);
    } catch (error) {
      console.error("Error parsing stored user data:", error);
      return null;
    }

    // Get the session token
    const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      return null;
    }

    // Try to fetch the latest user data from backend API
    try {
      const response = await fetch(buildApiUrl(API_ENDPOINTS.USER), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const backendUserData = await response.json();
        if (backendUserData.success && backendUserData.user) {
          // Create Parse.User from backend response
          const user = new Parse.User();
          user.id = backendUserData.user.id;
          user.set("username", backendUserData.user.username);
          user.set("email", backendUserData.user.email);
          (user as any)._sessionToken = sessionToken;
          return user;
        }
      }
    } catch (error) {
      console.error(
        "Error fetching user from backend, falling back to stored data:",
        error,
      );
    }

    // If backend fetch fails, create a user from stored data
    const user = new Parse.User();
    user.id = userData.objectId;

    // Apply user attributes
    const userKeys = Object.keys(userData);
    for (const key of userKeys) {
      // Skip special Parse keys that should not be set directly
      if (["objectId", "createdAt", "updatedAt", "ACL", "_sessionToken"].includes(key)) {
        continue;
      }

      try {
        user.set(key, userData[key]);
      } catch (e) {
        console.error(`Could not set ${key} on user:`, e);
      }
    }

    // Set session token
    (user as any)._sessionToken = sessionToken;

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};
