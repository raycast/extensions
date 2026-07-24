export type MenuBarDateFormat = "relative" | "short" | "long" | "iso";

export interface SimpleReminderPreferences {
  mobileNotificationNtfy: boolean;
  mobileNotificationNtfyTopic: string;
  mobileNotificationNtfyServerAccessToken: string;
  mobileNotificationNtfyServerUrl: string;
  menuBarDateFormat: MenuBarDateFormat;
}
