import { OAuth } from "@raycast/api";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { OAUTH_CALLBACK_URL } from "./config";

// Hardcoded Supabase credentials - these are PUBLIC values shared by all users
// RLS (Row Level Security) enforces data isolation per user
const SUPABASE_URL = "https://tafnybfhwybgijozwfyq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRhZm55YmZod3liZ2lqb3p3ZnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNjU4MTMsImV4cCI6MjA4Mjc0MTgxM30.Y7ai6tC3dU7M4-lYxlB0ccpIxxskFQRLLN-epmUuEcA";

// OAuth client for Supabase authentication
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.Web,
  providerName: "PromptNote",
  providerIcon: "icon.png",
  providerId: "promptnote",
  description: "Connect your PromptNote account",
});

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the Supabase client instance
 * Creates a new client if one doesn't exist
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // We handle session persistence via Raycast OAuth
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Get stored OAuth tokens
 */
export async function getStoredTokens(): Promise<OAuth.TokenSet | undefined> {
  return await client.getTokens();
}

/**
 * Store OAuth tokens after successful authentication
 */
export async function storeTokens(tokens: OAuth.TokenResponse): Promise<void> {
  await client.setTokens(tokens);
}

/**
 * Clear stored tokens (logout)
 */
export async function clearTokens(): Promise<void> {
  await client.removeTokens();
}

/**
 * Check if user is authenticated
 * Returns true if both access token and refresh token exist
 * (refresh token never expires and can always get a new access token)
 */
export async function isAuthenticated(): Promise<boolean> {
  const tokens = await getStoredTokens();
  return !!tokens?.accessToken && !!tokens?.refreshToken;
}

/**
 * Get the authorization request for OAuth flow
 */
export async function getAuthorizationRequest(): Promise<OAuth.AuthorizationRequest> {
  return await client.authorizationRequest({
    endpoint: `${SUPABASE_URL}/auth/v1/authorize`,
    clientId: "promptnote-raycast",
    scope: "openid profile email",
    extraParameters: {
      provider: "email", // Can be changed to google, github, etc.
    },
  });
}

/**
 * Authorize with OAuth flow
 * Opens browser for user to login
 */
export async function authorize(): Promise<OAuth.TokenSet> {
  const authRequest = await getAuthorizationRequest();
  const { authorizationCode } = await client.authorize(authRequest);

  // Exchange authorization code for tokens
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=authorization_code`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        code: authorizationCode,
        code_verifier: authRequest.codeVerifier,
      }),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to exchange authorization code for tokens");
  }

  const tokenResponse = (await response.json()) as OAuth.TokenResponse;
  await storeTokens(tokenResponse);

  // Set the session in Supabase client
  const supabase = getSupabaseClient();
  await supabase.auth.setSession({
    access_token: tokenResponse.access_token,
    refresh_token: tokenResponse.refresh_token || "",
  });

  return (await client.getTokens()) as OAuth.TokenSet;
}

/**
 * Simple email/password login (alternative to OAuth)
 * This is a simpler approach that works well with Raycast preferences
 */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.session) {
    // Store tokens for session persistence
    await storeTokens({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
    });
  }
}

/**
 * Login with GitHub OAuth
 * Opens browser for GitHub authentication
 */
export async function loginWithGitHub(): Promise<void> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: OAUTH_CALLBACK_URL,
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // The browser will open and redirect to the callback URL
  // User will need to complete the flow in the browser
  if (data.url) {
    const { open } = await import("@raycast/api");
    await open(data.url);
  }
}

/**
 * Login with Google OAuth
 * Opens browser for Google authentication
 */
export async function loginWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: OAUTH_CALLBACK_URL,
      skipBrowserRedirect: false,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // The browser will open and redirect to the callback URL
  // User will need to complete the flow in the browser
  if (data.url) {
    const { open } = await import("@raycast/api");
    await open(data.url);
  }
}

/**
 * Refresh the access token
 */
export async function refreshTokens(): Promise<void> {
  const tokens = await getStoredTokens();

  if (!tokens?.refreshToken) {
    throw new Error("No refresh token available");
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: tokens.refreshToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (data.session) {
    await storeTokens({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in || 3600,
    });
  }
}

/**
 * Ensure authenticated session
 * Refreshes token if expired, or throws if not authenticated
 */
export async function ensureAuthenticated(): Promise<string> {
  const tokens = await getStoredTokens();

  if (!tokens?.accessToken) {
    throw new Error("Not authenticated. Please login first.");
  }

  // Refresh if token is expired or about to expire (within 5 minutes)
  if (tokens.isExpired() || (tokens.expiresIn && tokens.expiresIn < 300)) {
    await refreshTokens();
    const newTokens = await getStoredTokens();
    if (!newTokens?.accessToken) {
      throw new Error("Failed to refresh authentication.");
    }
    return newTokens.accessToken;
  }

  return tokens.accessToken;
}

/**
 * Get authenticated Supabase client
 * Sets the session before returning the client
 */
export async function getAuthenticatedClient(): Promise<SupabaseClient> {
  const accessToken = await ensureAuthenticated();
  const tokens = await getStoredTokens();
  const supabase = getSupabaseClient();

  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: tokens?.refreshToken || "",
  });

  return supabase;
}

/**
 * Logout and clear session
 * Robust version that handles cases where tokens are already cleared
 */
export async function logout(): Promise<void> {
  // Clear tokens first - this is the critical part for local state
  try {
    await clearTokens();
  } catch (clearError) {
    console.error("Failed to clear tokens:", clearError);
  }

  // Attempt signOut on Supabase side (best effort)
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
  } catch (signOutError) {
    // Ignore - local tokens are cleared, which is what matters
    console.error(
      "SignOut failed (expected if session invalid):",
      signOutError,
    );
  }
}

/**
 * Get current user ID
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const supabase = await getAuthenticatedClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

export { client };
