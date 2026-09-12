import type { LaunchProps, PreferenceValues } from "@raycast/api";

/**
 * Preference values
 */
export interface Preferences extends PreferenceValues {
  // global
  clipboard: boolean;

  // runtime
  bundleId: string;
}

/**
 * Supported apps
 */
export type SupportedApps = "Telegram" | "WhatsApp";

/**
 * Command arguments
 */
export interface Arguments {
  phoneNumber?: string;
}

/**
 * Extension arguments
 */
export interface ExtLaunchProps extends LaunchProps {
  arguments: Arguments;
}
