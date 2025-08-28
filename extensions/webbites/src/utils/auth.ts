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

// Constants
const PARSE_APP_ID = "J8V1hqSGBZeZ02hwvACtYzHw62SEgzuAYv6nqVgT";
const PARSE_SERVER_URL = "https://webbites.b4a.io";
const PARSE_JS_KEY = "b6oQSrCZaYbH089xsDLmbkcBolaeyHXVVhf54pOz";
const SESSION_TOKEN_KEY = "webbites_session_token";
const USER_DATA_KEY = "webbites_user_data";

/**
 * Initialize Parse SDK with application credentials
 */
export const initializeParse = () => {
  Parse.initialize(PARSE_APP_ID, PARSE_JS_KEY);
  Parse.serverURL = PARSE_SERVER_URL;
};

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

    // Try to refresh credentials with stored preferences
    try {
      const preferences = getPreferenceValues<{
        email: string;
        password: string;
      }>();

      if (preferences.email && preferences.password) {
        await login(preferences.email, preferences.password);
      }
    } catch (loginError) {
      console.error("Error refreshing login:", loginError);
      throw loginError;
      // Continue with the function even if refresh fails
    }

    // We have both token and user data - consider the user logged in
    return true;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
};

/**
 * Login with username and password
 * @param username User's email or username
 * @param password User's password
 * @returns Promise resolving to the Parse.User
 */
export const login = async (
  username: string,
  password: string,
): Promise<Parse.User> => {
  try {
    // Use the normal login process
    const user = await Parse.User.logIn(username, password);

    try {
      const isFirstLogin = await LocalStorage.getItem<string>("is_first_login");
      if (isFirstLogin == undefined || isFirstLogin == "true") {
        showToast({
          title: "Logged in",
          message: "Successfully logged in, loading your boookmarks...",
          style: Toast.Style.Success,
        });
        await LocalStorage.setItem("is_first_login", "false");
      }
    } catch (error) {
      console.error("Error checking isFirstLogin:", error);
    }

    // Store session token and user data
    await storeAuthData(user);

    return user;
  } catch (error) {
    console.error("Login error:", error);
    clearUserData();
    showFailureToast(error, { title: "Login failed" });
    throw new Error(`Login failed: ${(error as Error).message}`);
  }
};

/**
 * Store authentication data in LocalStorage
 * @param user Parse User object
 */
async function storeAuthData(user: Parse.User): Promise<void> {
  // Store session token
  const sessionToken = user.getSessionToken();
  await LocalStorage.setItem(SESSION_TOKEN_KEY, sessionToken);

  // Store user data
  const userData = {
    objectId: user.id,
    username: user.getUsername(),
    email: user.getEmail(),
    createdAt: user.createdAt,
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
 * Logout the current user
 */
export const logout = async (): Promise<void> => {
  try {
    // Get the session token first
    const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);

    // Perform server-side logout if we have a token
    if (sessionToken) {
      // Use Parse.User.logOut() which doesn't require becoming a user
      await Parse.User.logOut();
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
 * Get current user without using become() or setting readonly sessionToken
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

    // Create a new User query to fetch the current user with the session token
    const query = new Parse.Query(Parse.User);
    query.equalTo("objectId", userData.objectId);

    // Make API request with the session token in headers
    const requestOptions = {
      sessionToken: sessionToken,
    };

    // Try to fetch the latest user data from server
    try {
      const user = await query.first(requestOptions);
      if (user) {
        return user;
      }
    } catch (error) {
      console.error(
        "Error fetching user from server, falling back to stored data:",
        error,
      );
    }

    // If server fetch fails, create a user from stored data
    try {
      // Try to use Parse.User.fromJSON if available
      if (typeof Parse.User.fromJSON === "function") {
        const user = Parse.User.fromJSON(userData);
        return user;
      }
    } catch (e) {
      console.error("Could not use Parse.User.fromJSON:", e);
    }

    // Fallback: create user manually
    const user = new Parse.User();
    user.id = userData.objectId;

    // Apply user attributes
    const userKeys = Object.keys(userData);
    for (const key of userKeys) {
      // Skip special Parse keys that should not be set directly
      if (["objectId", "createdAt", "updatedAt", "ACL"].includes(key)) {
        continue;
      }

      try {
        user.set(key, userData[key]);
      } catch (e) {
        console.error(`Could not set ${key} on user:`, e);
      }
    }

    // If there's an ACL, try to set it
    if (userData.ACL) {
      try {
        const acl = new Parse.ACL(userData.ACL);
        user.setACL(acl);
      } catch (e) {
        console.error("Could not set ACL:", e);
      }
    }

    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};
