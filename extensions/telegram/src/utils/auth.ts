import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { isAuthenticated, authenticate, verifyPassword, TelegramConfig } from "../services/telegram-client";
import { handleTelegramError } from "./errors";

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

export async function handleAuthFlow(
  code?: string,
): Promise<{ success: boolean; needsCode: boolean; needsPassword?: boolean }> {
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

    if (result.needsPassword) {
      return { success: false, needsCode: false, needsPassword: true };
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
  } catch (rawError) {
    let friendlyError = rawError;
    try {
      handleTelegramError(rawError);
    } catch (e) {
      friendlyError = e;
    }
    await showFailureToast(friendlyError, { title: "Authentication Failed" });
    return { success: false, needsCode: false };
  }
}

export async function handlePasswordFlow(password: string): Promise<{ success: boolean }> {
  try {
    const config = getConfig();
    await verifyPassword(config, password);
    await showToast({
      style: Toast.Style.Success,
      title: "Authenticated",
      message: "Successfully authenticated with Telegram!",
    });
    return { success: true };
  } catch (rawError) {
    let friendlyError = rawError;
    try {
      handleTelegramError(rawError);
    } catch (e) {
      friendlyError = e;
    }
    await showFailureToast(friendlyError, { title: "Authentication Failed" });
    return { success: false };
  }
}
