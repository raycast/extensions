import { getApplications, LocalStorage, open, showHUD, showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import { API_ENDPOINTS, API_URL, APP, COMMAND_NOTIFICATIONS_MAP, RepeatMode } from "./consts";
import { ApiErrorResponse } from "./types";

export async function getAuthToken(): Promise<string | null> {
  return (await LocalStorage.getItem<string>("authToken")) || null;
}

export async function setAuthToken(token: string): Promise<void> {
  await LocalStorage.setItem("authToken", token);
}

export async function controlYouTubeMusic(command: string, data?: number | string): Promise<void> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  try {
    const response = await fetch(`${API_URL}${API_ENDPOINTS.COMMAND}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      body: JSON.stringify({ command, data }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    } else {
      showHUD(COMMAND_NOTIFICATIONS_MAP[command]);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      const responseData: unknown = await response.json();
      if (isApiErrorResponse(responseData)) {
        console.error("Error response:", responseData);
        throw new Error(responseData.message || "Unknown error occurred");
      }
    } else {
      const text = await response.text();
      console.log("Response:", text);
    }
  } catch (error: unknown) {
    console.error("Error sending command:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
}

export async function requestAuthCode(): Promise<{ code: string; token: string | null }> {
  try {
    const response = await fetch(`${API_URL}${API_ENDPOINTS.CODE_REQUEST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appId: APP.APP_ID,
        appName: APP.APP_NAME,
        appVersion: APP.APP_VERSION,
      }),
    });
    if (!response.ok) {
      console.error("Error response:", response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const responseData: unknown = await response.json();
    if (isApiErrorResponse(responseData)) {
      console.error("Error response:", responseData);
      throw new Error(responseData.message || "Unknown error occurred");
    }

    const { code } = responseData as { code: string };
    const token = await requestAuthToken(code);
    return { code, token };
  } catch (error: unknown) {
    console.error("Error requesting auth code:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
    throw error;
  }
}

async function requestAuthToken(code: string): Promise<string | null> {
  try {
    const response = await fetch(`${API_URL}${API_ENDPOINTS.TOKEN_REQUEST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appId: APP.APP_ID,
        code,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const responseData: unknown = await response.json();
    if (isApiErrorResponse(responseData)) {
      console.error("Error response:", responseData);
      throw new Error(responseData.message || "Unknown error occurred");
    }

    const { token } = responseData as { token: string };
    await setAuthToken(token);
    return token;
  } catch (error: unknown) {
    console.error("Error requesting auth token:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Error",
      message: error instanceof Error ? error.message : "An unknown error occurred",
    });
    return null;
  }
}

function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    typeof (data as ApiErrorResponse).error === "boolean" &&
    "message" in data &&
    typeof (data as ApiErrorResponse).message === "string"
  );
}

export function getRepeatModeName(mode: RepeatMode): string {
  switch (mode) {
    case RepeatMode.NONE:
      return "No Repeat";
    case RepeatMode.ALL:
      return "Repeat All";
    case RepeatMode.ONE:
      return "Repeat One";
    default:
      return "Unknown";
  }
}

async function isYTMDesktopInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === APP.BUNDLE_ID);
}

export async function checkYTMDInstallation() {
  if (!(await isYTMDesktopInstalled())) {
    const options: Toast.Options = {
      style: Toast.Style.Failure,
      title: "YTMDesktop is not installed.",
      message: `Install it from ${APP.DOWNLOAD_URL}`,
      primaryAction: {
        title: `Go to ${APP.DOWNLOAD_URL}`,
        onAction: (toast) => {
          open(APP.DOWNLOAD_URL);
          toast.hide();
        },
      },
    };
    await showToast(options);
    return false;
  }
  return true;
}
