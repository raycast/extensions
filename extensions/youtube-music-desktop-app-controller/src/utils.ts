import { LocalStorage } from "@raycast/api";
import fetch from "node-fetch";
import { API_URL, APP, RepeatMode } from "./consts";
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
    const response = await fetch(`${API_URL}/command`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${token}`,
      },
      body: JSON.stringify({ command, data }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
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
  } catch (error: any) {
    console.error("Error sending command:", error);

    if (error && error.code === "ECONNREFUSED") {
      throw new Error("Youtube Music Desktop is not running or Companion Server is not running");
    }

    throw new Error("Error sending command");
  }
}

export async function requestAuthCode(): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/auth/requestcode`, {
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
      throw new Error(`HTTP error! status: ${response}`);
    }
    // Take the code from the response and call another API to get the token while also returning the code to the UI
    const responseData: unknown = await response.json();
    if (isApiErrorResponse(responseData)) {
      console.error("Error response:", responseData);
      throw new Error(responseData.message || "Unknown error occurred");
    }

    const { code } = responseData as { code: string };

    await requestAuthToken(code);
  } catch (error: any) {
    console.error("Error requesting auth code:", error);
    throw new Error("Error requesting auth code");
  }
}

async function requestAuthToken(code: string): Promise<void> {
  try {
    const response = await fetch(`${API_URL}/auth/request`, {
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
  } catch (error: any) {
    console.error("Error requesting auth token:", error);
    throw new Error("Error requesting auth token");
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
