/**
 * Gmail API integration for 2FA code detection
 * Provides functionality to fetch and process 2FA codes from Gmail
 */

import { OAuth, getPreferenceValues, Icon } from "@raycast/api";
import { gmail as gmailClient, auth, gmail_v1 } from "@googleapis/gmail";
import { Message, Preferences, SearchType } from "./types";
import { useState, useEffect, useCallback, useRef } from "react";
import { extractCode, calculateLookBackMinutes } from "./utils";
import fetch from "node-fetch";

// Create an OAuth client ID via https://console.developers.google.com/apis/credentials
// As application type choose "iOS" (required for PKCE)
const client = new OAuth.PKCEClient({
  redirectMethod: OAuth.RedirectMethod.AppURI,
  providerName: "Google",
  providerIcon: Icon.Link,
  providerId: "google",
  description: "Connect your Google account to access 2FA codes",
});

function getClientId() {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.gmailClientId || "";
}

async function authorize(): Promise<void> {
  const tokenSet = await client.getTokens();
  if (tokenSet?.accessToken) {
    if (tokenSet.refreshToken && tokenSet.isExpired()) {
      try {
        await client.setTokens(await refreshTokens(tokenSet.refreshToken));
      } catch (error) {
        await client.removeTokens();
        throw new Error("Failed to refresh tokens");
      }
    }
    return;
  }

  const authRequest = await client.authorizationRequest({
    endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    clientId: getClientId(),
    scope: "https://www.googleapis.com/auth/gmail.readonly",
  });
  const { authorizationCode } = await client.authorize(authRequest);
  await client.setTokens(await fetchTokens(authRequest, authorizationCode));
}

async function fetchTokens(authRequest: OAuth.AuthorizationRequest, authCode: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", getClientId());
  params.append("code", authCode);
  params.append("verifier", authRequest.codeVerifier);
  params.append("grant_type", "authorization_code");
  params.append("redirect_uri", authRequest.redirectURI);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: params.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!response.ok) {
    console.error("fetch tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  return await response.json();
}

async function refreshTokens(refreshToken: string): Promise<OAuth.TokenResponse> {
  const params = new URLSearchParams();
  params.append("client_id", getClientId());
  params.append("refresh_token", refreshToken);
  params.append("grant_type", "refresh_token");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: params.toString(),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });
  if (!response.ok) {
    console.error("refresh tokens error:", await response.text());
    throw new Error(response.statusText);
  }
  const tokenResponse = await response.json();
  tokenResponse.refresh_token = tokenResponse.refresh_token ?? refreshToken;
  return tokenResponse;
}

async function getAuthorizedGmailClient() {
  await authorize();
  const tokens = await client.getTokens();
  if (!tokens?.accessToken) {
    throw new Error("Not authorized");
  }

  const oAuth2Client = new auth.OAuth2(getClientId());
  oAuth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    scope: tokens.scope,
    expiry_date: tokens.expiresIn,
  });

  return gmailClient({ version: "v1", auth: oAuth2Client });
}

/**
 * Fetches emails from Gmail API within a specific time window
 * @param searchType - Type of search (all messages or code-only)
 * @param since - Only fetch messages after this timestamp
 */
export async function getGmailMessages(searchType: SearchType, since: Date): Promise<Message[]> {
  try {
    const gmail = await getAuthorizedGmailClient();
    const prefs = getPreferenceValues<Preferences>();
    const lookbackMinutes = calculateLookBackMinutes(prefs.lookBackUnit, parseInt(prefs.lookBackAmount || "1", 10));

    // Convert cutoff time to Unix timestamp for Gmail query
    const queryTime = Math.floor(since.getTime() / 1000);
    const query = `after:${queryTime}`;

    // Fetch message IDs first (more efficient than full messages)
    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: 50, // Limit results for performance
    });

    if (!response.data.messages) {
      return [];
    }

    // Process messages in batches to avoid rate limits
    const messages: gmail_v1.Schema$Message[] = [];
    for (let i = 0; i < response.data.messages.length; i += 10) {
      const batch = response.data.messages.slice(i, i + 10);

      const details = await Promise.all(
        batch.map(async (msg: gmail_v1.Schema$Message) => {
          try {
            const detail = await gmail.users.messages.get({
              userId: "me",
              id: msg.id || "",
              format: "full",
            });
            return detail.data;
          } catch (error) {
            console.error("Failed to fetch message details:", error);
            return null;
          }
        })
      );
      messages.push(...details.filter((d: gmail_v1.Schema$Message | null): d is gmail_v1.Schema$Message => d !== null));
    }

    // Convert Gmail messages to our internal format and apply time filters
    const convertedMessages = messages.map((msg): Message | null => {
      const headers = msg.payload?.headers || [];
      const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
      const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
      const body = msg.snippet || "";
      const date = new Date(parseInt(msg.internalDate || "0"));

      // Double-check message is within our time window
      const msgTime = date.getTime();
      const cutoffTime = since.getTime();
      if (msgTime < cutoffTime) {
        return null;
      }

      // Ensure message isn't older than our lookback window
      const now = new Date();
      const maxAge = lookbackMinutes * 60 * 1000;
      if (now.getTime() - msgTime > maxAge) {
        return null;
      }

      return {
        guid: msg.id || "",
        message_date: date.toISOString(),
        sender: from,
        text: `${subject}\n${body}`,
        source: "email" as const,
      };
    });

    return convertedMessages.filter((msg): msg is Message => msg !== null);
  } catch (error) {
    console.error("Failed to fetch Gmail messages:", error);
    throw error;
  }
}

/**
 * Checks if Gmail OAuth is configured and authenticated
 */
export async function checkGmailAuth(): Promise<boolean> {
  try {
    const tokens = await client.getTokens();
    if (!tokens?.accessToken) {
      // Trigger authorization if no tokens
      await authorize();
      return true;
    }
    return true;
  } catch (error) {
    console.error("Gmail auth check failed:", error);
    return false;
  }
}

interface CachedMessage {
  message: Message;
  hasCode: boolean;
  timestamp: number;
}

export function useGmail(options: { searchText?: string; searchType: SearchType; enabled?: boolean }) {
  const [data, setData] = useState<Message[]>([]);
  const [permissionView, setPermissionView] = useState<JSX.Element | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [isInitialLoadStarted, setIsInitialLoadStarted] = useState(false);
  const isLoadingRef = useRef(false);

  // Calculate the cutoff time based on preferences
  const getCutoffTime = useCallback(() => {
    const prefs = getPreferenceValues<Preferences>();
    const lookbackMinutes = calculateLookBackMinutes(prefs.lookBackUnit, parseInt(prefs.lookBackAmount || "1", 10));
    return new Date(Date.now() - lookbackMinutes * 60 * 1000);
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!options.enabled || isLoadingRef.current) {
      console.log("Skipping Gmail fetch - disabled or already loading");
      return;
    }

    try {
      console.log("Starting Gmail fetch...");
      isLoadingRef.current = true;
      const cutoffTime = getCutoffTime();
      const messages = await getGmailMessages(options.searchType, cutoffTime);

      if (messages.length > 0) {
        setData(messages);
      }

      setIsInitialLoadComplete(true);
    } catch (error) {
      console.error("Failed to fetch Gmail messages:", error);
      if (!isInitialLoadComplete) {
        setIsInitialLoadComplete(true);
      }
    } finally {
      isLoadingRef.current = false;
    }
  }, [options.enabled, options.searchType, getCutoffTime]);

  // Reset state when search parameters change
  useEffect(() => {
    console.log("Search parameters changed, resetting Gmail state");
    setData([]);
    setIsInitialLoadComplete(false);
    setIsInitialLoadStarted(false);
  }, [options.searchText, options.searchType]);

  // Initial load
  useEffect(() => {
    if (!isInitialLoadStarted && options.enabled) {
      console.log("Starting initial Gmail load");
      setIsInitialLoadStarted(true);
      fetchMessages();
    }
  }, [fetchMessages, options.enabled, isInitialLoadStarted]);

  // Periodic refresh
  useEffect(() => {
    if (!isInitialLoadComplete || !options.enabled) return;

    console.log("Setting up Gmail polling");
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [fetchMessages, isInitialLoadComplete, options.enabled]);

  return {
    data,
    permissionView,
    revalidate: fetchMessages,
    isLoading: !isInitialLoadComplete,
  };
}
