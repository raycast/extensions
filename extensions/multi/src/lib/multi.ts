import { environment } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { setTimeout } from "timers/promises";
import { getPreferences } from "./getPreferences";

/**
 * Starts new Multi session.
 */
export async function startNewSession() {
  await retryWhileLoggingIn(() => multiScript("startNewSession"));
}

/**
 * Leave the current session
 */
export async function leaveSession() {
  await multiScript("leaveSession");
}

/**
 * Get teammates
 */
export async function getUsers(): Promise<GetUsersResponse> {
  return (await retryWhileLoggingIn(() => multiScript("getUsers"))) as GetUsersResponse;
}

interface GetUsersResponse {
  users: User[];
}

export interface User {
  id: string;
  fullname: string;
  availability: UserAvailability;
  session?: UserSession;
}

export enum UserAvailability {
  Online = "online",
  Focusing = "focusing",
  Away = "away",
}

export type UserSession = {
  shortdescription: string;
  room?: UserSessionRoomReference;
};

export type UserSessionRoomReference = {
  id: string;
  name: string;
};

/**
 * Search teammates and start a Multi session with them.
 */
export async function inviteUser(id: string) {
  await multiScript("inviteUserToTalk", { id });
}

/**
 * Get rooms
 */

export async function getRooms(): Promise<GetRoomsResponse> {
  return (await retryWhileLoggingIn(() => multiScript("getRooms"))) as GetRoomsResponse;
}

export interface GetRoomsResponse {
  rooms: Room[];
}

export interface Room {
  id: string;
  name: string;
  participants: CallParticipant[];
}

export interface CallParticipant {
  id: string;
  fullname: string;
}

/**
 * Search and join rooms.
 */
export async function joinRoom(id: string) {
  await multiScript("joinRoom", { id });
}

/**
 * Starts new Multi session.
 */
export async function copyCallLink(id?: string) {
  const parameters = id ? { id } : undefined;
  await retryWhileLoggingIn(() => multiScript("copyCallLink", parameters));
}

/**
 * Joins a call from a link.
 */
export async function joinCallFromLink(url: string) {
  await retryWhileLoggingIn(() => multiScript("joinCall", { url }));
}

// - Call Controls
export async function toggleMicrophone() {
  await multiScript("toggleMicrophone");
}
export async function toggleCamera() {
  await multiScript("toggleCamera");
}
export async function toggleSharingContent() {
  await multiScript("toggleSharingContent");
}

export function getAppleScriptErrorCode(error: unknown): number | undefined {
  if (!isAppleScriptError(error)) {
    return undefined;
  }

  // Unfortunately, Raycast API doesn't expose the error code of the error in a clean way yet so we parse it.
  const errorCodeRegularExpression = /\((.*?)\)$/;

  const match = errorCodeRegularExpression.exec(error.stderr);

  if (!match || match.length < 2) {
    return undefined;
  }

  try {
    const code = parseInt(match[1]);
    return code;
  } catch (error) {
    return undefined;
  }
}

function isAppleScriptError(error: unknown): error is AppleScriptError {
  const appleScriptError = error as AppleScriptError;
  return appleScriptError && typeof appleScriptError === "object" && typeof appleScriptError.stderr === "string";
}

interface AppleScriptError {
  stderr: string;
}

async function multiScript(name: string, parameters?: Record<string, unknown>): Promise<unknown> {
  const targetAppleScriptApplication = getPreferences().targetAppleScriptApplication;
  const effectiveParameters = { source: "raycast", ...parameters };
  const script = `Application("${targetAppleScriptApplication}").${name}(${JSON.stringify(effectiveParameters)})`;

  const response = await executeScript(script);

  if (response === "") {
    return undefined;
  } else {
    return JSON.parse(response);
  }
}

async function executeScript(script: string): Promise<string> {
  if (environment.isDevelopment) {
    console.log("script", script);

    const startDate = new Date();

    try {
      const response = await runAppleScript(script, {
        humanReadableOutput: false,
        language: "JavaScript",
      });

      const latencyMs = new Date().getTime() - startDate.getTime();

      console.log("response", `${latencyMs}ms`, response !== "", response);

      return response;
    } catch (error) {
      const latencyMs = new Date().getTime() - startDate.getTime();

      console.warn("multiScript error", `${latencyMs}ms`, error);

      throw error;
    }
  } else {
    return runAppleScript(script, {
      humanReadableOutput: false,
      language: "JavaScript",
    });
  }
}

async function retryWhileLoggingIn(callback: () => Promise<unknown>) {
  try {
    return await callback();
  } catch (error) {
    let remainingRetries = 15;
    let lastError = error;
    let appleScriptErrorCode = getAppleScriptErrorCode(error);

    while (remainingRetries > 0 && (appleScriptErrorCode === -1001 || appleScriptErrorCode === -1002)) {
      console.warn("retryWhileLoggingIn", { appleScriptErrorCode });

      await setTimeout(1000);

      try {
        return await callback();
      } catch (error) {
        lastError = error;
        appleScriptErrorCode = getAppleScriptErrorCode(error);
        remainingRetries -= 1;
      }
    }

    if (remainingRetries === 0) {
      console.warn("retryWhileLoggingIn: retries depleted");
    }

    throw lastError;
  }
}
