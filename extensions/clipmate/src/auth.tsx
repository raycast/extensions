import { OAuth } from "@raycast/api";
import { useEffect, useState } from "react";
import { decryptApiKey, secureStorage } from "./lib/security";
import { deleteCurrentApiKey } from "./services/graphql";

// Define the OAuth client ID and redirect URL
// These values should match what you configure in your Clipmate web app
const clientId = "clipmate-raycast";
const redirectURL = "https://raycast.com/redirect";

// Create the OAuth client
export const oauthClient = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "Clipmate",
  providerIcon: "clipmate.png",
  providerId: "clipmate",
  description: "Connect to your Clipmate account",
});

// Authorization endpoint - this should point to your web app's sign-in page
export async function authorize(): Promise<string> {
  // First check if we already have a valid API key stored securely
  const existingApiKey = await secureStorage.getSecure("apiKey");
  if (existingApiKey) {
    console.log("Using existing secure API key");
    return existingApiKey;
  }

  console.log("Starting OAuth flow");

  // Start the OAuth flow
  const authRequest = await oauthClient.authorizationRequest({
    endpoint: "https://app.clipmate.ai/sign-in",
    clientId,
    scope: "",
    extraParameters: {
      redirect_uri: redirectURL,
      skip_signin: "true",
    },
  });

  console.log("Starting authorization");

  // Open the authorization URL in the browser
  const { authorizationCode } = await oauthClient.authorize(authRequest);

  if (!authorizationCode) {
    console.error("No authorization code returned from OAuth flow");
    throw new Error("No authorization code returned from OAuth flow");
  }

  console.log("Received encrypted API key from OAuth flow");

  try {
    // The encryption passphrase must match what was used on the server
    // We use the state from the auth request to reconstruct the passphrase
    const encryptionPassphrase = `clipmate-raycast-${authRequest.state}-production`;

    // Decrypt the API key
    const decryptedApiKey = await decryptApiKey(decodeURIComponent(authorizationCode), encryptionPassphrase);

    // Store the decrypted API key securely
    await secureStorage.setSecure("apiKey", decryptedApiKey);

    // Also store in OAuth tokens for backward compatibility (but this will be removed later)
    await oauthClient.setTokens({
      accessToken: decryptedApiKey,
      refreshToken: "",
      // Don't set expiresIn since API keys don't expire
    });

    return decryptedApiKey;
  } catch (error) {
    console.error("Failed to decrypt API key:", error);
    throw new Error("Failed to decrypt API key. Please try signing in again.");
  }
}

// Function to check if the user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  // Check secure storage first
  const secureApiKey = await secureStorage.getSecure("apiKey");
  if (secureApiKey) {
    return true;
  }

  // Fallback to OAuth tokens for backward compatibility
  const tokenSet = await oauthClient.getTokens();
  return tokenSet?.accessToken !== undefined;
}

// Function to get the current API key
export async function getApiKey(): Promise<string | null> {
  // Try secure storage first
  const secureApiKey = await secureStorage.getSecure("apiKey");
  if (secureApiKey) {
    return secureApiKey;
  }

  // Fallback to OAuth tokens for backward compatibility
  const tokenSet = await oauthClient.getTokens();
  if (!tokenSet?.accessToken) {
    console.log("No API key available");
    return null;
  }

  // Migrate from OAuth storage to secure storage
  try {
    await secureStorage.setSecure("apiKey", tokenSet.accessToken);
    console.log("Migrated API key to secure storage");
    return tokenSet.accessToken;
  } catch (error) {
    console.error("Failed to migrate API key to secure storage:", error);
    return tokenSet.accessToken;
  }
}

// Function to securely logout
export async function secureLogout(): Promise<void> {
  try {
    // First, try to delete the API key from the server
    const currentApiKey = await getApiKey();
    if (currentApiKey) {
      console.log("Attempting to delete API key from server...");
      const deleted = await deleteCurrentApiKey(currentApiKey);
      if (deleted) {
        console.log("API key successfully deleted from server");
      } else {
        console.warn("Failed to delete API key from server, continuing with local cleanup");
      }
    }

    // Clear secure storage
    await secureStorage.clearAll();

    // Clear OAuth tokens
    await oauthClient.removeTokens();

    console.log("Secure logout completed");
  } catch (error) {
    console.error("Error during secure logout:", error);
    // Even if server deletion fails, we should still clear local storage
    try {
      await secureStorage.clearAll();
      await oauthClient.removeTokens();
      console.log("Local cleanup completed despite server error");
    } catch (localError) {
      console.error("Failed to clear local storage:", localError);
    }
    throw error;
  }
}

// Hook to use authentication in components
export function useAuth() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchToken() {
      try {
        setIsLoading(true);
        const key = await getApiKey();
        if (isMounted) {
          setApiKey(key);
        }
      } catch (e) {
        console.error("Error fetching API key:", e);
        if (isMounted) {
          setError(e instanceof Error ? e : new Error("Failed to get API key"));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchToken();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      const key = await authorize();
      setApiKey(key);
      return key;
    } catch (e) {
      console.error("Authorization error:", e);
      setError(e instanceof Error ? e : new Error("Failed to authorize"));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await secureLogout();
      setApiKey(null);
    } catch (e) {
      console.error("Logout error:", e);
      setError(e instanceof Error ? e : new Error("Failed to logout"));
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    apiKey,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!apiKey,
  };
}
