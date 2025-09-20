import { getPreferenceValues } from "@raycast/api";
import fetch from "node-fetch";

interface Preferences {
  v2rayaHost: string;
  username: string;
  password: string;
}

interface V2rayAStatus {
  running: boolean;
  address?: string;
  latency?: string;
  message?: string;
}

export async function getToken(): Promise<string> {
  const { v2rayaHost, username, password } = getPreferenceValues<Preferences>();
  try {
    const response = await fetch(`${v2rayaHost}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await response.json();

    if (data.code !== "SUCCESS" || !data.data?.token) {
      throw new Error("Authentication failed. Check your credentials!");
    }

    return data.data.token;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to get auth token: ${error.message}`);
    }
    throw new Error("Failed to get auth token: Unknown error occurred");
  }
}

export async function checkStatus(token: string): Promise<V2rayAStatus> {
  const { v2rayaHost } = getPreferenceValues<Preferences>();
  const response = await fetch(`${v2rayaHost}/api/touch`, {
    method: "GET",
    headers: {
      Authorization: token,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  const status: V2rayAStatus = {
    running: data.data.running || false,
  };

  if (data.data.running) {
    status.address = data.data.touch?.servers?.[0]?.address;
    status.latency = data.data.touch?.servers?.[0]?.pingLatency;
  }

  return status;
}

export async function toggleConnection(token: string, start: boolean): Promise<void> {
  const { v2rayaHost } = getPreferenceValues<Preferences>();

  const response = await fetch(`${v2rayaHost}/api/v2ray`, {
    method: start ? "POST" : "DELETE",
    headers: {
      Authorization: token,
      Accept: "application/json",
    },
  });

  const data = await response.json();

  if (data.code !== "SUCCESS") {
    throw new Error(`Failed to ${start ? "start" : "stop"} connection`);
  }
}
