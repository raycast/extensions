import Parse from "parse/node.js";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { UserData } from "../types";

// Constants
const SESSION_TOKEN_KEY = "webbites_session_token";
const USER_DATA_KEY = "webbites_user_data";

// Simple user class that mimics Parse.User's basic functionality
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

  // Add other getter methods as needed
}

// Get current user using the SimpleUser approach
export const getSimpleCurrentUser = async (): Promise<SimpleUser | null> => {
  try {
    // Check if we have stored user data
    const userDataString = await LocalStorage.getItem<string>(USER_DATA_KEY);
    if (!userDataString) {
      console.log("No stored user data found 2");
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

// Helper function to make authenticated Parse API requests
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

    // const headers = {
    //   "X-Parse-Application-Id": Parse.applicationId,
    //   "X-Parse-REST-API-Key": Parse.javaScriptKey,
    //   "X-Parse-Session-Token": sessionToken,
    //   "Content-Type": "application/json",
    // };
    const headers: Record<string, string> = {
      "X-Parse-Application-Id": Parse.applicationId,
      "Content-Type": "application/json",
    };

    if (Parse.javaScriptKey) {
      headers["X-Parse-REST-API-Key"] = Parse.javaScriptKey;
    }

    headers["X-Parse-Session-Token"] = sessionToken;

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
