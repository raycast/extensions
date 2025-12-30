import {
  showHUD,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  open,
  LaunchProps,
} from "@raycast/api";

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("dotenv").config();
} catch {
  // dotenv optional in development
}

const BACKEND_TOKEN_KEY = "hang_backend_token";

async function getBackendToken(): Promise<string | null> {
  const token = await LocalStorage.getItem<string>(BACKEND_TOKEN_KEY);
  return token || null;
}

async function setBackendToken(token: string): Promise<void> {
  await LocalStorage.setItem(BACKEND_TOKEN_KEY, token);
}

async function clearBackendToken(): Promise<void> {
  await LocalStorage.removeItem(BACKEND_TOKEN_KEY);
}

async function ensureAuthenticated(backendUrl: string, provider: "google" | "zoom"): Promise<string> {
  const token = await getBackendToken();

  if (!token) {
    const state = generateRandomString(32);
    const oauthUrl = `${backendUrl}/oauth/${provider}/start?state=${encodeURIComponent(state)}`;
    await open(oauthUrl);

    await showToast({
      style: Toast.Style.Animated,
      title: `Authenticating with ${provider === "google" ? "Google" : "Zoom"}...`,
      message: "Please complete authentication in your browser",
    });

    const maxAttempts = 24;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        const tokenResponse = await fetch(`${backendUrl}/oauth/token?state=${encodeURIComponent(state)}`);
        if (tokenResponse.ok) {
          const data = (await tokenResponse.json()) as { token?: string };
          if (data.token) {
            await setBackendToken(data.token);
            return data.token;
          }
        }
      } catch {
        // Continue polling
      }
    }

    throw new Error("Authentication timeout. Please complete authentication in your browser and try again.");
  }

  return token;
}

function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function handleOAuthCallback(_props: LaunchProps): Promise<void> {
  // Reserved for future deep link support
}

const DEFAULT_BACKEND_URL = "https://hang-backend.ty-944.workers.dev";

async function createGoogleMeetMeeting(): Promise<string> {
  const backendUrl = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const token = await ensureAuthenticated(backendUrl, "google");

  const response = await fetch(`${backendUrl}/api/create-meeting`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401) {
      await clearBackendToken();
      throw new Error("Authentication expired. Please run the command again to re-authenticate.");
    }

    if (response.status === 403) {
      if (errorText.includes("Google account not authenticated")) {
        await clearBackendToken();
        await showToast({
          style: Toast.Style.Animated,
          title: "Authenticating with Google...",
          message: "Please complete authentication in your browser",
        });
        const newToken = await ensureAuthenticated(backendUrl, "google");
        const retryResponse = await fetch(`${backendUrl}/api/create-meeting`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${newToken}`,
            "Content-Type": "application/json",
          },
        });
        if (!retryResponse.ok) {
          const retryErrorText = await retryResponse.text();
          throw new Error(`Failed to create meeting after authentication: ${retryErrorText}`);
        }
        const retryData = (await retryResponse.json()) as { meetLink?: string };
        if (!retryData.meetLink) {
          throw new Error("No meeting link found in response");
        }
        return retryData.meetLink;
      }
    }

    let errorDetails = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = JSON.stringify(errorJson, null, 2);
    } catch {
      // If not JSON, use as-is
    }
    throw new Error(`Failed to create meeting (${response.status} ${response.statusText}):\n${errorDetails}`);
  }

  const data = (await response.json()) as { meetLink?: string };
  if (!data.meetLink) {
    throw new Error("No meeting link found in response");
  }

  return data.meetLink;
}

async function createZoomMeeting(): Promise<string> {
  const backendUrl = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendToken = await ensureAuthenticated(backendUrl, "zoom");

  const response = await fetch(`${backendUrl}/api/create-zoom-meeting`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${backendToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401) {
      await clearBackendToken();
      throw new Error("Authentication expired. Please run the command again to re-authenticate.");
    }

    if (response.status === 403) {
      try {
        const errorJson = JSON.parse(errorText) as { code?: string; error?: string };
        if (errorJson.code === "ZOOM_NOT_AUTHENTICATED") {
          await clearBackendToken();
          await showToast({
            style: Toast.Style.Animated,
            title: "Authenticating with Zoom...",
            message: "Please complete authentication in your browser",
          });
          // Trigger Zoom OAuth - this will open browser and poll for token
          const newToken = await ensureAuthenticated(backendUrl, "zoom");
          // Retry the request after authentication
          const retryResponse = await fetch(`${backendUrl}/api/create-zoom-meeting`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${newToken}`,
              "Content-Type": "application/json",
            },
          });
          if (!retryResponse.ok) {
            const retryErrorText = await retryResponse.text();
            throw new Error(`Failed to create meeting after authentication: ${retryErrorText}`);
          }
          const retryData = (await retryResponse.json()) as { meetLink?: string };
          if (!retryData.meetLink) {
            throw new Error("No meeting link found in response");
          }
          return retryData.meetLink;
        }
      } catch {
        // Continue with normal error handling
      }
    }

    let errorDetails = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      errorDetails = JSON.stringify(errorJson, null, 2);
    } catch {
      // Use error text as-is if not JSON
    }
    throw new Error(`Failed to create Zoom meeting (${response.status} ${response.statusText}):\n${errorDetails}`);
  }

  const data = (await response.json()) as { meetLink?: string };
  if (!data.meetLink) {
    throw new Error("No meeting link found in response");
  }

  return data.meetLink;
}

export default async function main(props: LaunchProps) {
  if (props.launchContext?.token) {
    await handleOAuthCallback(props);
    return;
  }

  try {
    await showToast({
      style: Toast.Style.Animated,
      title: "Creating meeting...",
    });

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

    await Clipboard.copy(meetingLink);
    await showHUD(`✓ Copied ${platformName} link to clipboard`);

    if (autoOpen) {
      await open(meetingLink);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error creating meeting:", error);

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
      const displayMessage = errorMessage.length > 200 ? errorMessage.substring(0, 200) + "..." : errorMessage;
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to create meeting",
        message: displayMessage,
      });
    }
  }
}
