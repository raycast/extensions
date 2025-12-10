import { getPreferenceValues } from "@raycast/api";
import fetch, { RequestInit } from "node-fetch";

// Types derived from Swagger
export interface GenericResponse<T> {
  Result?: T;
  Message?: string;
  Success: boolean;
}

export interface GenericResponseOfStatusCodeResponse {
  Result?: {
    StatusCode: number;
  };
  Message?: string;
  Success: boolean;
}

export interface Bot {
  BotName: string;
  IsConnectedAndLoggedOn: boolean;
  KeepRunning: boolean;
  SteamID?: string;
  AvatarHash?: string;
  Nickname?: string;
  CardsFarmer: {
    Paused: boolean;
    TimeRemaining: string;
    CurrentGamesFarming: Array<{
      AppID: number;
      GameName: string;
      CardsRemaining: number;
    }>;
  };
}

export interface GlobalConfig {
  SteamOwnerID: string;
  MaxFarmingTime: number;
  // ... other global config properties
}

export interface CommandRequest {
  Command: string;
}

export interface Preferences {
  asfUrl: string;
  ipcPassword?: string;
}

export function getASFUrl(): string {
  const prefs = getPreferenceValues<Preferences>();
  let url = prefs.asfUrl || "http://localhost:1242";
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  return url;
}

export function getIPCPassword(): string | undefined {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.ipcPassword;
}

async function asfFetch<T>(endpoint: string, options?: RequestInit): Promise<GenericResponse<T>> {
  const url = `${getASFUrl()}/Api${endpoint}`;
  const password = getIPCPassword();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };

  if (password) {
    headers["Authentication"] = password;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // ASF sometimes returns error messages in the body even with non-200 status
      const text = await response.text();
      try {
        const json = JSON.parse(text) as GenericResponse<T>;
        return json;
      } catch {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }
    }

    const json = (await response.json()) as GenericResponse<T>;
    return json;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Available to connect to ASF at ${getASFUrl()}. Ensure ASF is running and IPC is enabled. Error: ${error.message}`,
      );
    }
    throw error;
  }
}

export async function getBots(): Promise<Record<string, Bot>> {
  const response = await asfFetch<Record<string, Bot>>("/Bot/ASF");
  if (!response.Success || !response.Result) {
    throw new Error(response.Message || "Failed to fetch bots");
  }
  return response.Result;
}

export async function getOneBot(botName: string): Promise<Bot> {
  const response = await asfFetch<Record<string, Bot>>(`/Bot/${botName}`);
  if (!response.Success || !response.Result || !response.Result[botName]) {
    throw new Error(response.Message || `Failed to fetch bot ${botName}`);
  }
  return response.Result[botName];
}

export async function sendCommand(command: string): Promise<string> {
  // Use the /Api/Command endpoint
  const response = await asfFetch<string>("/Command", {
    method: "POST",
    body: JSON.stringify({ Command: command }),
  });

  if (!response.Success) {
    throw new Error(response.Message || "Command execution failed");
  }
  return response.Result || "";
}

export async function get2FAToken(botName: string): Promise<string | null> {
  // /Api/Bot/{botNames}/TwoFactorAuthentication/Token
  const response = await asfFetch<Record<string, { Result?: string; Success: boolean; Message?: string }>>(
    `/Bot/${botName}/TwoFactorAuthentication/Token`,
  );
  if (!response.Success || !response.Result || !response.Result[botName]) {
    return null; // Or throw error
  }
  const botResult = response.Result[botName];
  if (!botResult.Success || !botResult.Result) {
    return null;
  }
  return botResult.Result;
}

export async function pauseBot(botName: string, permanent: boolean, resumeInSeconds: number = 0) {
  const response = await asfFetch(`/Bot/${botName}/Pause`, {
    method: "POST",
    body: JSON.stringify({ Permanent: permanent, ResumeInSeconds: resumeInSeconds }),
  });
  return response;
}

export async function resumeBot(botName: string) {
  const response = await asfFetch(`/Bot/${botName}/Resume`, {
    method: "POST",
  });
  return response;
}

export async function startBot(botName: string) {
  const response = await asfFetch(`/Bot/${botName}/Start`, { method: "POST" });
  return response;
}

export async function stopBot(botName: string) {
  const response = await asfFetch(`/Bot/${botName}/Stop`, { method: "POST" });
  return response;
}
