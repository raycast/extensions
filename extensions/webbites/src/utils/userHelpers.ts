// utils/userHelpers.ts - Refactored

import Parse from "parse/node.js";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { UserData } from "../types";

// Constants
const SESSION_TOKEN_KEY = "webbites_session_token";
const USER_DATA_KEY = "webbites_user_data";

/**
 * Simple user class that mimics Parse.User's basic functionality
 */
export class SimpleUser {
  private data: UserData;

  constructor(userData: Partial<UserData>) {
    this.data = {
      ...userData,
      objectId: userData.objectId || "",
      username: userData.username || "",
      email: userData.email || "",
    };
  }

  get id(): string {
    return this.data.objectId;
  }

  getUsername(): string {
    return this.data.username;
  }

  getEmail(): string {
    return this.data.email;
  }

  get(key: string): string | Date | undefined {
    return this.data[key];
  }

  getSessionToken(): string | null {
    return this.data._sessionToken || null;
  }
}

/**
 * Get current user using the SimpleUser approach
 * @returns Promise resolving to SimpleUser or null
 */
export const getSimpleCurrentUser = async (): Promise<SimpleUser | null> => {
  try {
    // Get stored user data
    const userData = await getUserData();
    if (!userData) {
      return null;
    }

    // Get the session token and add it to the user data
    const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
    if (sessionToken) {
      userData._sessionToken = sessionToken;
    }

    // Create our simplified user object
    return new SimpleUser(userData);
  } catch (error) {
    console.error("Error getting simple user:", error);
    return null;
  }
};

/**
 * Get user data from storage
 * @returns UserData object or null
 */
export const getUserData = async (): Promise<UserData | null> => {
  try {
    const userDataString = await LocalStorage.getItem<string>(USER_DATA_KEY);

    if (!userDataString) {
      return null;
    }

    return JSON.parse(userDataString);
  } catch (error) {
    console.error("Error parsing stored user data:", error);
    return null;
  }
};

/**
 * Make an authenticated request to the Parse API
 * @param endpoint API endpoint
 * @param method HTTP method
 * @param data Request data
 * @returns Promise resolving to response data
 */
export const makeAuthenticatedRequest = async (
  endpoint: string,
  method = "GET",
  data?: Record<string, unknown>,
) => {
  try {
    const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
    if (!sessionToken) {
      throw new Error("No session token available");
    }

    // Set up headers
    const headers: Record<string, string> = {
      "X-Parse-Application-Id": Parse.applicationId,
      "Content-Type": "application/json",
    };

    if (Parse.javaScriptKey) {
      headers["X-Parse-REST-API-Key"] = Parse.javaScriptKey;
    }

    headers["X-Parse-Session-Token"] = sessionToken;

    // Make the request
    const url = `${Parse.serverURL}/${endpoint}`;
    const options: RequestInit = {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    };

    const response = await fetch(url, options);
    if (!response.ok) {
      showFailureToast({
        title: "Error Making Request",
        message: `API request failed: ${response.status} ${response.statusText}`,
      });
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}`,
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Authenticated request error:", error);
    throw error;
  }
};

/**
 * Clear all user data from local storage
 */
export const clearUserData = async () => {
  await LocalStorage.clear();
};
