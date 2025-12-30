import { showHUD, Clipboard, showToast, Toast, getPreferenceValues, OAuth, LocalStorage, open } from "@raycast/api";

// Load .env file in development (Raycast doesn't do this automatically)
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config();
} catch {
  // dotenv is optional, ignore if not available
}

async function createGoogleMeetMeeting(): Promise<string> {
  const preferences = getPreferenceValues<{
    googleClientId?: string;
    googleClientSecret?: string;
  }>();

  // Use developer's Client ID/Secret (set via environment variables or hardcoded)
  // Users can override in preferences if they want to use their own
  const clientId = preferences.googleClientId || process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = preferences.googleClientSecret || process.env.GOOGLE_CLIENT_SECRET || "";

  if (!clientId) {
    throw new Error(
      "Google OAuth Client ID not configured.\n\n" +
        "The extension developer should set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.\n" +
        "If you're the developer, set these in your .env file or contact the extension author.",
    );
  }

  if (!clientSecret) {
    throw new Error(
      "Google OAuth Client Secret not configured.\n\n" +
        "The extension developer should set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.\n" +
        "If you're the developer, set these in your .env file or contact the extension author.",
    );
  }

  // Create custom OAuth client with Web redirect method (uses https://raycast.com/redirect)
  // This works with Web application OAuth clients in Google Cloud Console
  const oauthClient = new OAuth.PKCEClient({
    redirectMethod: OAuth.RedirectMethod.Web,
    providerName: "Google",
    providerId: "google",
    description: "Connect your Google account",
  });

  // Check for existing tokens
  const currentTokenSet = await oauthClient.getTokens();
  let token: string;

  if (currentTokenSet?.accessToken && !currentTokenSet.isExpired()) {
    token = currentTokenSet.accessToken;
  } else {
    // Get authorization code
    const authRequest = await oauthClient.authorizationRequest({
      endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      clientId: clientId,
      scope: "https://www.googleapis.com/auth/calendar.events",
    });

    const { authorizationCode } = await oauthClient.authorize(authRequest);

    // Exchange authorization code for tokens (with client_secret)
    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("code", authorizationCode);
    params.append("code_verifier", authRequest.codeVerifier);
    params.append("grant_type", "authorization_code");
    params.append("redirect_uri", authRequest.redirectURI);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    await oauthClient.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });
    token = tokens.access_token;
  }

  // Create a calendar event with a Google Meet link using the Calendar API
  // This works for both personal and Workspace accounts
  const now = new Date();
  const endTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

  const event = {
    summary: "Quick Meeting",
    visibility: "public", // Make the event public so anyone can join
    guestsCanInviteOthers: true, // Allow guests to invite others
    guestsCanModify: false, // Don't allow guests to modify the event
    start: {
      dateTime: now.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
  };

  const createResponse = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    },
  );

  if (!createResponse.ok) {
    const errorText = await createResponse.text();
    let errorDetails = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = JSON.stringify(errorJson, null, 2);
    } catch {
      // If not JSON, use as-is
    }
    throw new Error(
      `Failed to create calendar event (${createResponse.status} ${createResponse.statusText}):\n${errorDetails}`,
    );
  }

  const createdEvent = (await createResponse.json()) as {
    id?: string;
    conferenceData?: {
      entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
    };
    hangoutLink?: string;
  };

  // Extract the Meet link from the event
  const meetLink =
    createdEvent.conferenceData?.entryPoints?.find((ep) => ep.entryPointType === "video")?.uri ||
    createdEvent.hangoutLink;

  if (!meetLink) {
    // Still try to delete the event even if we didn't get a link
    if (createdEvent.id) {
      try {
        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${createdEvent.id}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch {
        // Ignore deletion errors if we're already failing
      }
    }
    throw new Error("No meeting link found in response");
  }

  // Delete the calendar event after getting the link
  if (createdEvent.id) {
    try {
      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${createdEvent.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!deleteResponse.ok) {
        // Log but don't fail - we have the link
        console.warn(`Failed to delete calendar event: ${deleteResponse.status}`);
      }
    } catch (error) {
      // Log but don't fail - we have the link
      console.warn("Error deleting calendar event:", error);
    }
  }

  return meetLink;
}

async function getZoomAccessToken(accountId: string, clientId: string, clientSecret: string): Promise<string> {
  // Check cache first (cache key includes credentials hash to invalidate on change)
  const cacheKey = `zoom_token_${accountId}_${clientId}`;
  const cached = await LocalStorage.getItem<{ token: string; expiresAt: number }>(cacheKey);

  // Use cached token if it exists and hasn't expired (with 5 minute buffer)
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
  }

  // Trim all credentials to remove any whitespace
  const trimmedAccountId = accountId.trim();
  const trimmedClientId = clientId.trim();
  const trimmedClientSecret = clientSecret.trim();

  // Validate credentials are not empty after trimming
  if (!trimmedAccountId || !trimmedClientId || !trimmedClientSecret) {
    throw new Error("Zoom credentials cannot be empty. Please check your Account ID, Client ID, and Client Secret.");
  }

  // Base64 encode client ID and client secret for Basic Auth
  // Format: base64(clientId:clientSecret)
  const credentials = Buffer.from(`${trimmedClientId}:${trimmedClientSecret}`).toString("base64");

  // Generate access token using Server-to-Server OAuth
  const tokenResponse = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: trimmedAccountId,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    let errorDetails = errorText;
    let errorJson: { error?: string; reason?: string } | null = null;

    try {
      errorJson = JSON.parse(errorText);
      errorDetails = JSON.stringify(errorJson, null, 2);
    } catch {
      // If not JSON, use as-is
    }

    // Provide more helpful error messages for common issues
    if (errorJson?.error === "invalid_client") {
      throw new Error(
        `Invalid Zoom credentials. Please verify:\n` +
          `1. Your Client ID and Client Secret are correct (no extra spaces)\n` +
          `2. Your Account ID matches your Zoom app\n` +
          `3. Your app is activated in the Zoom Marketplace\n` +
          `4. Your app has the "meeting:write" scope enabled\n\n` +
          `Original error: ${errorDetails}`,
      );
    }

    throw new Error(
      `Failed to get Zoom access token (${tokenResponse.status} ${tokenResponse.statusText}):\n${errorDetails}`,
    );
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    token_type?: string;
    expires_in?: number;
  };

  if (!tokenData.access_token) {
    throw new Error("No access token found in Zoom OAuth response");
  }

  // Cache the token (Server-to-Server tokens typically expire in 1 hour, but we'll cache for 50 minutes to be safe)
  const expiresIn = tokenData.expires_in || 3600; // Default to 1 hour
  const expiresAt = Date.now() + (expiresIn - 600) * 1000; // Cache for expires_in - 10 minutes
  await LocalStorage.setItem(cacheKey, {
    token: tokenData.access_token,
    expiresAt,
  });

  return tokenData.access_token;
}

async function createZoomMeeting(): Promise<string> {
  const preferences = getPreferenceValues<{
    zoomAccessToken?: string;
    zoomAccountId?: string;
    zoomClientId?: string;
    zoomClientSecret?: string;
  }>();

  // Get credentials for potential fallback
  const accountId = (preferences.zoomAccountId || process.env.ZOOM_ACCOUNT_ID || "").trim();
  const clientId = (preferences.zoomClientId || process.env.ZOOM_CLIENT_ID || "").trim();
  const clientSecret = (preferences.zoomClientSecret || process.env.ZOOM_CLIENT_SECRET || "").trim();
  const hasCredentials = accountId && clientId && clientSecret;

  // Option 1: Use pre-generated access token if provided
  const accessToken = (preferences.zoomAccessToken || process.env.ZOOM_ACCESS_TOKEN || "").trim();

  if (accessToken) {
    try {
      // Try using the provided token first
      return await createZoomMeetingWithToken(accessToken);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // If token is invalid and we have credentials, try generating a new one
      if (errorMessage.includes("Invalid access token") || errorMessage.includes("401")) {
        if (hasCredentials) {
          console.log("Access token invalid, generating new token from credentials...");
          const generatedToken = await getZoomAccessToken(accountId, clientId, clientSecret);
          return await createZoomMeetingWithToken(generatedToken);
        } else {
          throw new Error(
            `Invalid or expired Zoom access token. Please:\n` +
              `1. Generate a new token from https://marketplace.zoom.us/develop/token, OR\n` +
              `2. Set Account ID, Client ID, and Client Secret to auto-generate tokens`,
          );
        }
      }
      // Re-throw other errors
      throw error;
    }
  }

  // Option 2: Generate token from credentials
  if (!hasCredentials) {
    const missingFields: string[] = [];
    if (!accountId) missingFields.push("Account ID");
    if (!clientId) missingFields.push("Client ID");
    if (!clientSecret) missingFields.push("Client Secret");

    throw new Error(
      `Zoom credentials not configured. Missing: ${missingFields.join(", ")}\n\n` +
        "Option 1 (Simplest): Set a Zoom Access Token in preferences or ZOOM_ACCESS_TOKEN in .env\n" +
        "Option 2 (Recommended): Set Account ID, Client ID, and Client Secret in preferences or .env\n\n" +
        "Get credentials from: https://marketplace.zoom.us/develop/create\n\n" +
        "Note: Server-to-Server OAuth doesn't require user login - it uses account-level authentication.",
    );
  }

  // Generate access token from credentials
  const generatedToken = await getZoomAccessToken(accountId, clientId, clientSecret);
  return await createZoomMeetingWithToken(generatedToken);
}

async function createZoomMeetingWithToken(accessToken: string): Promise<string> {
  // Create a Zoom meeting using the Zoom API
  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: "Quick Meeting",
      type: 1, // Instant meeting
      settings: {
        join_before_host: true,
        participant_video: false,
        host_video: false,
        mute_upon_entry: false,
        approval_type: 0, // Automatically approve
        audio: "both",
        auto_recording: "none",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetails = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = JSON.stringify(errorJson, null, 2);
    } catch {
      // If not JSON, use as-is
    }
    throw new Error(`Failed to create Zoom meeting (${response.status} ${response.statusText}):\n${errorDetails}`);
  }

  const meeting = (await response.json()) as {
    join_url?: string;
    id?: number;
  };

  if (!meeting.join_url) {
    throw new Error("No meeting link found in Zoom response");
  }

  return meeting.join_url;
}

export default async function main() {
  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Creating meeting...",
    });

    // Get preferences
    const preferences = getPreferenceValues<{
      meetingPlatform?: string;
      autoOpenLink?: boolean;
    }>();
    const platform = preferences.meetingPlatform || "google_meet";
    const autoOpen = preferences.autoOpenLink ?? false;

    let meetingLink: string;
    let platformName: string;

    if (platform === "zoom") {
      meetingLink = await createZoomMeeting();
      platformName = "Zoom";
    } else {
      meetingLink = await createGoogleMeetMeeting();
      platformName = "Google Meet";
    }

    // Copy the meeting link to clipboard
    await Clipboard.copy(meetingLink);

    // Show success message with checkmark
    await showHUD(`✓ Copied ${platformName} link to clipboard`);

    // Optionally open the link
    if (autoOpen) {
      await open(meetingLink);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating meeting:", error);

    // Provide helpful error message for OAuth errors
    if (errorMessage.includes("redirect_uri") || errorMessage.includes("invalid_request")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "OAuth Configuration Error",
        message:
          "Redirect URI mismatch. Check the browser URL when the error appears - it will show the redirect_uri parameter. Add that exact URI to your Google Cloud Console OAuth client.",
      });
    } else if (errorMessage.includes("client_secret")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "OAuth Configuration Error",
        message:
          "Client secret is missing or invalid. Please check your Google OAuth Client Secret in Raycast preferences.",
      });
    } else {
      // Show full error message, truncate if too long
      const displayMessage = errorMessage.length > 200 ? errorMessage.substring(0, 200) + "..." : errorMessage;
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create meeting",
        message: displayMessage,
      });
    }
  }
}
