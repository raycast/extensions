import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { isAuthenticated, authenticate, TelegramConfig } from "../services/telegram-client";
import { getTelegramErrorMessage } from "./errors";

export interface Preferences {
  apiId: string;
  apiHash: string;
  phoneNumber: string;
}

export function getConfig(): TelegramConfig {
  const preferences = getPreferenceValues<Preferences>();

  const apiId = parseInt(preferences.apiId, 10);
  if (isNaN(apiId)) {
    throw new Error("Invalid API ID. Please check your preferences.");
  }

  return {
    apiId,
    apiHash: preferences.apiHash,
    phoneNumber: preferences.phoneNumber,
  };
}

export async function ensureAuthenticated(): Promise<boolean> {
  const authenticated = await isAuthenticated();

  if (!authenticated) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Not Authenticated",
      message: "Please authenticate with Telegram first. Run the authentication command.",
    });
    return false;
  }

  return true;
}

export async function handleAuthFlow(options?: {
  code?: string;
  password?: string;
  forceResendCode?: boolean;
}): Promise<{ success: boolean; needsCode: boolean; needsPassword: boolean }> {
  const config = getConfig();

  try {
    const result = await authenticate(config, options);

    if (result.needsCode && !options?.code && !options?.password) {
      await showToast({
        style: Toast.Style.Success,
        title: options?.forceResendCode ? "Code Resent" : "Code Sent",
        message: "Check your Telegram app (official Telegram chat) for the latest login code.",
      });
      return { success: false, needsCode: true, needsPassword: false };
    }

    if (result.needsPassword) {
      await showToast({
        style: Toast.Style.Success,
        title: "Password Required",
        message: "Enter your Telegram 2-Step Verification password.",
      });
      return { success: false, needsCode: false, needsPassword: true };
    }

    return { success: true, needsCode: false, needsPassword: false };
  } catch (error) {
    throw new Error(getTelegramErrorMessage(error));
  }
}
