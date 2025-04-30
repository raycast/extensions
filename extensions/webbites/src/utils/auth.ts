import Parse from "parse/node.js";
import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

// Constants
const PARSE_APP_ID = "J8V1hqSGBZeZ02hwvACtYzHw62SEgzuAYv6nqVgT";
const PARSE_SERVER_URL = "https://webbites.b4a.io";
const PARSE_JS_KEY = "b6oQSrCZaYbH089xsDLmbkcBolaeyHXVVhf54pOz";
const SESSION_TOKEN_KEY = "webbites_session_token";
const USER_DATA_KEY = "webbites_user_data";

// Initialize Parse
export const initializeParse = () => {
  Parse.initialize(PARSE_APP_ID, PARSE_JS_KEY);
  Parse.serverURL = PARSE_SERVER_URL;
  // console.log("Parse initialized");
};

// Check if user is logged in
export const isLoggedIn = async (): Promise<boolean> => {
  try {
    // Check if we have a session token
    const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
    // console.log('Session token check:', sessionToken ? 'Found token' : 'No token');

    if (!sessionToken) {
      return false;
    }

    // Check if we have stored user data
    const userDataString = await LocalStorage.getItem<string>(USER_DATA_KEY);
    if (!userDataString) {
      // console.log('No user data found');
      return false;
    }

    // We have both token and user data - we'll consider the user logged in
    return true;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
};

// Login with username and password
export const login = async (
  username: string,
  password: string,
): Promise<Parse.User> => {
  try {
    // Use the normal login process
    const user = await Parse.User.logIn(username, password);
    console.log("User logged in successfully:", user.getUsername());

    // Get and store the session token
    const sessionToken = user.getSessionToken();
    await LocalStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
    console.log("Session token stored");

    // Store essential user data
    const userData = {
      objectId: user.id,
      username: user.getUsername(),
      email: user.getEmail(),
      createdAt: user.createdAt,
      // Don't store the session token in the user data object
      // We'll store it separately
    };
    await LocalStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    console.log("User data stored");

    return user;
  } catch (error) {
    console.error("Login error:");
    // console.error("Login error:", error);
    showFailureToast(error, { title: "Login failed" });
    throw new Error(`Login failed: ${(error as Error).message}`);
  }
};

// Get stored session token
export const getSessionToken = async (): Promise<string | null> => {
  const token = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
  return token ?? null;
};

// Logout
export const logout = async (): Promise<void> => {
  try {
    // Get the session token first
    const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);

    // Perform server-side logout if we have a token
    if (sessionToken) {
      // You can use Parse.User.logOut() which doesn't require becoming a user
      await Parse.User.logOut();
      console.log("Server-side logout completed");
    }

    // Clear local storage regardless of server response
    await LocalStorage.removeItem(SESSION_TOKEN_KEY);
    await LocalStorage.removeItem(USER_DATA_KEY);
    console.log("Local storage cleared");
  } catch (error) {
    console.error("Logout error:", error);

    // Even if server-side logout fails, clear local storage
    await LocalStorage.removeItem(SESSION_TOKEN_KEY);
    await LocalStorage.removeItem(USER_DATA_KEY);
    console.log("Local storage cleared after error");

    throw new Error(`Logout failed: ${(error as Error).message}`);
  }
};

// Get current user without using become() or setting readonly sessionToken
export const getCurrentUser = async (): Promise<Parse.User | null> => {
  try {
    // Check if we have stored user data
    const userDataString = await LocalStorage.getItem<string>(USER_DATA_KEY);
    if (!userDataString) {
      console.log("No stored user data found");
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
      console.log("No session token found");
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
        // console.log('Retrieved user from server:', user.getUsername());
        return user;
      }
    } catch (error) {
      console.log(
        "Error fetching user from server, falling back to stored data:",
        error,
      );
    }

    // If server fetch fails, create a user from stored data
    console.log("Creating user from stored data");

    // Option 1: If Parse.User.fromJSON is available (newer versions of Parse)
    try {
      if (typeof Parse.User.fromJSON === "function") {
        const user = Parse.User.fromJSON(userData);
        return user;
      }
    } catch (e) {
      console.log("Could not use Parse.User.fromJSON:", e);
    }

    // Option 2: Manual approach - create a new user and set attributes
    const user = new Parse.User();

    // Set the id
    user.id = userData.objectId;

    // Apply all the user attributes manually
    // (This is what _finishFetch was doing behind the scenes)
    const userKeys = Object.keys(userData);
    for (const key of userKeys) {
      // Skip special Parse keys that should not be set directly
      if (["objectId", "createdAt", "updatedAt", "ACL"].includes(key)) {
        continue;
      }

      try {
        user.set(key, userData[key]);
      } catch (e) {
        console.log(`Could not set ${key} on user:`, e);
      }
    }

    // If there's an ACL, try to set it
    if (userData.ACL) {
      try {
        const acl = new Parse.ACL(userData.ACL);
        user.setACL(acl);
      } catch (e) {
        console.log("Could not set ACL:", e);
      }
    }

    // We can't directly set the session token on the user object in a type-safe way
    // The Parse SDK doesn't expose a public API for this
    // Instead, we'll just return the user object as is

    // Note: If you need the session token later, you can retrieve it from local storage
    // or store it as a separate property in your auth management system

    console.log("Reconstructed user from stored data:", userData.username);
    return user;
  } catch (error) {
    console.error("Error getting current user:", error);
    return null;
  }
};
// export const getCurrentUser = async (): Promise<Parse.User | null> => {
//   try {
//     // Check if we have stored user data
//     const userDataString = await LocalStorage.getItem<string>(USER_DATA_KEY);
//     if (!userDataString) {
//       console.log("No stored user data found");
//       return null;
//     }

//     // Parse the user data
//     let userData;
//     try {
//       userData = JSON.parse(userDataString);
//     } catch (error) {
//       console.error("Error parsing stored user data:", error);
//       return null;
//     }

//     // Get the session token
//     const sessionToken = await LocalStorage.getItem<string>(SESSION_TOKEN_KEY);
//     if (!sessionToken) {
//       console.log("No session token found");
//       return null;
//     }

//     // Create a new User query to fetch the current user with the session token
//     const query = new Parse.Query(Parse.User);
//     query.equalTo("objectId", userData.objectId);

//     // Make API request with the session token in headers
//     const requestOptions = {
//       sessionToken: sessionToken,
//     };

//     // Try to fetch the latest user data from server
//     try {
//       const user = await query.first(requestOptions);
//       if (user) {
//         // console.log('Retrieved user from server:', user.getUsername());
//         return user;
//       }
//     } catch (error) {
//       console.log(
//         "Error fetching user from server, falling back to stored data:",
//         error,
//       );
//     }

//     // If server fetch fails, create a user from stored data
//     console.log("Creating user from stored data");
//     const user = new Parse.User();
//     user.id = userData.objectId;
//     user.fromJSON(userData); // Use internal API to set data without validation
//     // user._finishFetch(userData); // Use internal API to set data without validation

//     console.log("Reconstructed user from stored data:", userData.username);
//     return user;
//   } catch (error) {
//     console.error("Error getting current user:", error);
//     return null;
//   }
// };
