import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { isAuthenticated, authenticate, TelegramConfig } from "../services/telegram-client";

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

export async function handleAuthFlow(code?: string): Promise<{ success: boolean; needsCode: boolean }> {
  try {
    const config = getConfig();
    const result = await authenticate(config, code);

    if (result.needsCode && !code) {
      await showToast({
        style: Toast.Style.Success,
        title: "Code Sent",
        message: "Please enter the code sent to your Telegram app.",
      });
      return { success: false, needsCode: true };
    }

    if (!result.needsCode) {
      await showToast({
        style: Toast.Style.Success,
        title: "Authenticated",
        message: "Successfully authenticated with Telegram!",
      });
      return { success: true, needsCode: false };
    }

    return { success: false, needsCode: result.needsCode };
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Authentication Failed",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    });
    return { success: false, needsCode: false };
  }
}
