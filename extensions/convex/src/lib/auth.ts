/**
 * Convex OAuth Device Code Flow for Raycast
 *
 * Uses the OAuth 2.0 Device Authorization Grant (RFC 8628) to authenticate
 * with Convex. This flow is ideal for CLI and desktop apps since it:
 * 1. Doesn't require a redirect URI
 * 2. Works without exposing client secrets
 * 3. Opens a browser for secure authentication
 */

import { LocalStorage, open, showToast, Toast } from "@raycast/api";
import {
  AUTH_ISSUER,
  AUTH_CLIENT_ID,
  BIG_BRAIN_URL,
  STORAGE_KEYS,
} from "./constants";

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
}

export interface ConvexSession {
  accessToken: string;
  tokenType: string;
  expiresAt?: number;
  refreshToken?: string;
}

interface AuthEndpoints {
  device_authorization_endpoint: string;
  token_endpoint: string;
}

/**
 * Discover OAuth endpoints from the issuer's well-known configuration
 */
async function discoverAuthEndpoints(): Promise<AuthEndpoints> {
  const response = await fetch(
    `${AUTH_ISSUER}/.well-known/openid-configuration`,
  );
  if (!response.ok) {
    throw new Error(
      `Failed to discover auth configuration: ${response.status}`,
    );
  }
  return response.json();
}

/**
 * Start the device authorization flow
 * Returns the device code and user code for display
 */
export async function startDeviceAuthorization(): Promise<DeviceAuthResponse> {
  const config = await discoverAuthEndpoints();

  const response = await fetch(config.device_authorization_endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: AUTH_CLIENT_ID,
      scope: "openid profile email",
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Failed to start device authorization: ${response.status} ${errorText}`,
    );
  }

  return response.json();
}

/**
 * Poll for the device token after user has authenticated in browser
 */
export async function pollForDeviceToken(
  auth: DeviceAuthResponse,
  onPoll?: () => void,
  shouldStop?: () => boolean,
): Promise<TokenResponse | null> {
  const { token_endpoint } = await discoverAuthEndpoints();
  const pollInterval = (auth.interval || 5) * 1000;
  const expiresAt = Date.now() + auth.expires_in * 1000;

  while (Date.now() < expiresAt) {
    if (shouldStop?.()) {
      return null;
    }

    onPoll?.();

    const response = await fetch(token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        client_id: AUTH_CLIENT_ID,
        device_code: auth.device_code,
      }).toString(),
    });

    if (response.ok) {
      return response.json();
    }

    const errorBody = await response.json().catch(() => ({}));
    const error = errorBody.error;

    if (error === "authorization_pending" || error === "slow_down") {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      continue;
    }

    if (error === "expired_token") {
      throw new Error("Authentication expired. Please try again.");
    }
    if (error === "access_denied") {
      throw new Error("Authentication was denied.");
    }

    throw new Error(`Authentication failed: ${error || response.status}`);
  }

  return null;
}

/**
 * Exchange the OIDC token for a Convex dashboard session token
 */
export async function exchangeForDashboardToken(
  oidcToken: string,
): Promise<ConvexSession> {
  const response = await fetch(`${BIG_BRAIN_URL}/api/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      authnToken: oidcToken,
      deviceName: "Convex Tools Raycast Extension",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(
      `Failed to authorize with Convex: ${response.status} ${errorText}`,
    );
  }

  const data = await response.json();
  return {
    accessToken: data.accessToken,
    tokenType: data.tokenType ?? "Bearer",
    expiresAt: data.expiresAt ? Date.now() + data.expiresAt * 1000 : undefined,
    refreshToken: data.refreshToken,
  };
}

/**
 * Save session to Raycast's secure local storage
 */
export async function saveSession(session: ConvexSession): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
  if (session.expiresAt) {
    await LocalStorage.setItem(
      STORAGE_KEYS.TOKEN_EXPIRES_AT,
      session.expiresAt.toString(),
    );
  }
  if (session.refreshToken) {
    await LocalStorage.setItem(
      STORAGE_KEYS.REFRESH_TOKEN,
      session.refreshToken,
    );
  }
}

/**
 * Load session from Raycast's secure local storage
 */
export async function loadSession(): Promise<ConvexSession | null> {
  const accessToken = await LocalStorage.getItem<string>(
    STORAGE_KEYS.ACCESS_TOKEN,
  );
  if (!accessToken) {
    return null;
  }

  const expiresAtStr = await LocalStorage.getItem<string>(
    STORAGE_KEYS.TOKEN_EXPIRES_AT,
  );
  const refreshToken = await LocalStorage.getItem<string>(
    STORAGE_KEYS.REFRESH_TOKEN,
  );

  return {
    accessToken,
    tokenType: "Bearer",
    expiresAt: expiresAtStr ? parseInt(expiresAtStr, 10) : undefined,
    refreshToken,
  };
}

/**
 * Clear the session from storage
 */
export async function clearSession(): Promise<void> {
  await Promise.all([
    LocalStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN),
    LocalStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT),
    LocalStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN),
    LocalStorage.removeItem(STORAGE_KEYS.SELECTED_TEAM_ID),
    LocalStorage.removeItem(STORAGE_KEYS.SELECTED_PROJECT_ID),
    LocalStorage.removeItem(STORAGE_KEYS.SELECTED_DEPLOYMENT_NAME),
  ]);
}

/**
 * Check if the session is expired
 */
export function isSessionExpired(session: ConvexSession): boolean {
  if (!session.expiresAt) {
    return false;
  }
  return Date.now() > session.expiresAt - 5 * 60 * 1000;
}

/**
 * Full authentication flow with UI feedback
 */
export async function authenticate(): Promise<ConvexSession> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Starting authentication...",
  });

  try {
    const deviceAuth = await startDeviceAuthorization();

    toast.style = Toast.Style.Animated;
    toast.title = "Waiting for authentication";
    toast.message = `Code: ${deviceAuth.user_code}`;

    await open(deviceAuth.verification_uri_complete);

    const tokens = await pollForDeviceToken(deviceAuth);
    if (!tokens) {
      throw new Error("Authentication expired or cancelled");
    }

    toast.title = "Completing authentication...";
    toast.message = undefined;

    const session = await exchangeForDashboardToken(tokens.access_token);

    await saveSession(session);

    toast.style = Toast.Style.Success;
    toast.title = "Authenticated successfully";

    return session;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Authentication failed";
    toast.message = error instanceof Error ? error.message : "Unknown error";
    throw error;
  }
}

// ============================================================================
// Project/Deployment Selection Storage
// ============================================================================

export interface SelectedContext {
  teamId: number | null;
  teamSlug: string | null;
  projectId: number | null;
  projectSlug: string | null;
  deploymentName: string | null;
  deploymentType: string | null;
}

export async function saveSelectedContext(
  context: SelectedContext,
): Promise<void> {
  if (context.teamId) {
    await LocalStorage.setItem(
      STORAGE_KEYS.SELECTED_TEAM_ID,
      context.teamId.toString(),
    );
  }
  if (context.teamSlug) {
    await LocalStorage.setItem(
      STORAGE_KEYS.SELECTED_TEAM_SLUG,
      context.teamSlug,
    );
  }
  if (context.projectId) {
    await LocalStorage.setItem(
      STORAGE_KEYS.SELECTED_PROJECT_ID,
      context.projectId.toString(),
    );
  }
  if (context.projectSlug) {
    await LocalStorage.setItem(
      STORAGE_KEYS.SELECTED_PROJECT_SLUG,
      context.projectSlug,
    );
  }
  if (context.deploymentName) {
    await LocalStorage.setItem(
      STORAGE_KEYS.SELECTED_DEPLOYMENT_NAME,
      context.deploymentName,
    );
  }
  if (context.deploymentType) {
    await LocalStorage.setItem(
      STORAGE_KEYS.SELECTED_DEPLOYMENT_TYPE,
      context.deploymentType,
    );
  }
}

export async function loadSelectedContext(): Promise<SelectedContext> {
  const teamIdStr = await LocalStorage.getItem<string>(
    STORAGE_KEYS.SELECTED_TEAM_ID,
  );
  const teamSlug = await LocalStorage.getItem<string>(
    STORAGE_KEYS.SELECTED_TEAM_SLUG,
  );
  const projectIdStr = await LocalStorage.getItem<string>(
    STORAGE_KEYS.SELECTED_PROJECT_ID,
  );
  const projectSlug = await LocalStorage.getItem<string>(
    STORAGE_KEYS.SELECTED_PROJECT_SLUG,
  );
  const deploymentName = await LocalStorage.getItem<string>(
    STORAGE_KEYS.SELECTED_DEPLOYMENT_NAME,
  );
  const deploymentType = await LocalStorage.getItem<string>(
    STORAGE_KEYS.SELECTED_DEPLOYMENT_TYPE,
  );

  return {
    teamId: teamIdStr ? parseInt(teamIdStr, 10) : null,
    teamSlug: teamSlug ?? null,
    projectId: projectIdStr ? parseInt(projectIdStr, 10) : null,
    projectSlug: projectSlug ?? null,
    deploymentName: deploymentName ?? null,
    deploymentType: deploymentType ?? null,
  };
}
