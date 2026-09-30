import { runAppleScript } from "@raycast/utils";

export interface DeviceStatus {
  device_ip: string;
  device_port: string;
  device_name: string;
  adb_connected: string;
  notifications_count: string;
  device_version: string;
}

export interface NotificationAction {
  name: string;
  type: "reply" | "button";
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  app: string;
  package?: string;
  nid?: string;
  actions?: NotificationAction[];
  app_icon_base64?: string;
}

export interface NotificationActionResponse {
  status: string;
  message: string;
  notification_id: string;
  action_name: string;
  reply_text?: string;
  notification_title: string;
}

export interface DismissNotificationResponse {
  status: string;
  message: string;
  notification_id: string;
  notification_title: string;
}

export interface MediaInfo {
  title: string;
  artist: string;
  is_playing: string;
  volume: string;
  is_muted: string;
  like_status: string;
  album_art_base64?: string;
}

export interface App {
  package_name: string;
  name: string;
  system_app: boolean;
  listening: boolean;
  icon?: string;
}

export interface AppsResponse {
  apps: App[];
  count: number;
}

export interface MirrorResponse {
  success: boolean;
  message: string;
  device?: string;
  ip?: string;
  app_name?: string;
  package_name?: string;
  mode?: string;
  note?: string;
  error?: string;
}

export interface MediaControlResponse {
  status: string;
  action: string;
  message: string;
  current_media?: {
    title: string;
    artist: string;
    is_playing: boolean;
    like_status: string;
  };
}

export async function getStatus(): Promise<DeviceStatus | null> {
  try {
    const result = await runAppleScript('tell application "AirSync" to get status');
    if (result.includes("No device connected")) {
      return null;
    }
    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to get status:", error);
    throw new Error("Failed to get AirSync status. Make sure AirSync is running.");
  }
}

export async function disconnect(): Promise<string> {
  try {
    const result = await runAppleScript('tell application "AirSync" to disconnect');
    return result;
  } catch (error) {
    console.error("Failed to disconnect:", error);
    throw new Error("Failed to disconnect. Make sure AirSync is running.");
  }
}

export async function reconnect(): Promise<string> {
  try {
    const result = await runAppleScript('tell application "AirSync" to reconnect');
    return result;
  } catch (error) {
    console.error("Failed to reconnect:", error);
    throw new Error("Failed to reconnect. Make sure AirSync is running.");
  }
}

export async function getNotifications(): Promise<Notification[]> {
  try {
    const result = await runAppleScript('tell application "AirSync" to get notifications');
    if (result.includes("No notifications") || result.includes("No device connected")) {
      return [];
    }
    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to get notifications:", error);
    throw new Error("Failed to get notifications. Make sure AirSync is running.");
  }
}

export async function notificationAction(
  notificationId: string,
  actionName: string,
  replyText?: string,
): Promise<NotificationActionResponse | string> {
  try {
    const actionString = replyText ? `${notificationId}|${actionName}|${replyText}` : `${notificationId}|${actionName}`;
    const result = await runAppleScript(`tell application "AirSync" to notification action "${actionString}"`);
    // Try to parse as JSON, if it fails, it's an error message
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  } catch (error) {
    console.error("Failed to perform notification action:", error);
    throw new Error("Failed to perform notification action. Make sure AirSync is running.");
  }
}

export async function dismissNotification(notificationId: string): Promise<DismissNotificationResponse | string> {
  try {
    const result = await runAppleScript(`tell application "AirSync" to dismiss notification "${notificationId}"`);
    // Try to parse as JSON, if it fails, it's an error message
    try {
      return JSON.parse(result);
    } catch {
      return result;
    }
  } catch (error) {
    console.error("Failed to dismiss notification:", error);
    throw new Error("Failed to dismiss notification. Make sure AirSync is running.");
  }
}

export async function getMedia(): Promise<MediaInfo | null> {
  try {
    const result = await runAppleScript('tell application "AirSync" to get media');
    if (result.includes("No media playing") || result.includes("No device connected")) {
      return null;
    }
    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to get media:", error);
    throw new Error("Failed to get media information. Make sure AirSync is running.");
  }
}

export async function mediaControl(
  action: "toggle" | "next" | "previous" | "like",
): Promise<MediaControlResponse | string> {
  try {
    const result = await runAppleScript(`tell application "AirSync" to media control "${action}"`);
    // Try to parse as JSON, if it fails, it's an error message
    try {
      return JSON.parse(result);
    } catch {
      // If parsing fails, return the error message as string
      return result;
    }
  } catch (error) {
    console.error(`Failed to ${action} media:`, error);
    throw new Error(`Failed to control media. Make sure AirSync is running.`);
  }
}

export async function launchMirroring(): Promise<MirrorResponse> {
  try {
    const result = await runAppleScript('tell application "AirSync" to launch mirroring');
    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to launch mirroring:", error);
    throw new Error("Failed to launch mirroring. Make sure AirSync is running.");
  }
}

export async function getApps(): Promise<AppsResponse> {
  try {
    const result = await runAppleScript('tell application "AirSync" to get apps');
    // Try to parse as JSON, if it fails, the result might be an error message
    try {
      return JSON.parse(result);
    } catch {
      // If parsing fails, throw the actual message from AirSync
      throw new Error(result || "Failed to get apps. Make sure AirSync is running.");
    }
  } catch (error) {
    console.error("Failed to get apps:", error);
    throw error instanceof Error ? error : new Error("Failed to get apps. Make sure AirSync is running.");
  }
}

export async function mirrorApp(packageName: string): Promise<MirrorResponse> {
  try {
    const result = await runAppleScript(`tell application "AirSync" to mirror app "${packageName}"`);
    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to mirror app:", error);
    throw new Error("Failed to mirror app. Make sure AirSync is running.");
  }
}

export async function launchDesktopMode(): Promise<MirrorResponse> {
  try {
    const result = await runAppleScript('tell application "AirSync" to desktop mode');
    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to launch desktop mode:", error);
    throw new Error("Failed to launch desktop mode. Make sure AirSync is running.");
  }
}

export async function connectAdb(): Promise<string> {
  try {
    const result = await runAppleScript('tell application "AirSync" to connect adb');
    return result;
  } catch (error) {
    console.error("Failed to connect ADB:", error);
    throw new Error("Failed to connect ADB. Make sure AirSync is running.");
  }
}
