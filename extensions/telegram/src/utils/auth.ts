import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import {
  isAuthenticated,
  authenticateWithQr,
  authenticateWithPassword,
  TelegramConfig,
} from "../services/telegram-client";
import { getTelegramErrorMessage } from "./errors";

export function getConfig(): TelegramConfig {
  const preferences = getPreferenceValues<Preferences>();

  const apiIdStr = preferences.apiId?.trim();
  if (!apiIdStr) {
    throw new Error("API ID is required. Please check your preferences.");
  }

  const apiId = parseInt(apiIdStr, 10);
  if (isNaN(apiId)) {
    throw new Error("Invalid API ID. Please check your preferences.");
  }

  const apiHash = preferences.apiHash?.trim();
  if (!apiHash) {
    throw new Error("API Hash is required. Please check your preferences.");
  }

  return {
    apiId,
    apiHash,
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

export async function handlePasswordAuthFlow(password: string): Promise<boolean> {
  let toast: Toast | undefined;

  try {
    const config = getConfig();

    toast = await showToast({
      style: Toast.Style.Animated,
      title: "Verifying Password",
      message: "Connecting to Telegram...",
    });

    await authenticateWithPassword(config, password);

    toast.style = Toast.Style.Success;
    toast.title = "Authentication Successful";
    toast.message = "Successfully authenticated with Telegram.";
    return true;
  } catch (error) {
    console.error("[PASSWORD AUTH FLOW] Failed:", error);
    const message = getTelegramErrorMessage(error);
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Authentication Failed";
      toast.message = message;
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message,
      });
    }
    throw new Error(message);
  }
}

export async function handleQrAuthFlow(callbacks: {
  onQrCode: (qrData: { tgUrl: string; dataUrl: string }) => void | Promise<void>;
  abortSignal?: AbortSignal;
}): Promise<{ success: boolean; needsPassword: boolean }> {
  let toast: Toast | undefined;

  try {
    const config = getConfig();

    toast = await showToast({
      style: Toast.Style.Animated,
      title: "Generating QR Code",
      message: "Connecting to Telegram...",
    });

    const result = await authenticateWithQr(config, {
      onQrCode: async (qrData) => {
        if (toast) {
          toast.style = Toast.Style.Success;
          toast.title = "QR Code Ready";
          toast.message = "Scan with Telegram on your phone";
        }
        await callbacks.onQrCode(qrData);
      },
      abortSignal: callbacks.abortSignal,
    });

    if (callbacks.abortSignal?.aborted || (!result.success && !result.needsPassword)) {
      return { success: false, needsPassword: false };
    }

    if (result.needsPassword) {
      if (toast) {
        toast.style = Toast.Style.Success;
        toast.title = "Password Required";
        toast.message = "Enter your Telegram 2-Step Verification password.";
      }
      return { success: false, needsPassword: true };
    }

    if (toast) {
      toast.style = Toast.Style.Success;
      toast.title = "Authentication Successful";
      toast.message = "Successfully authenticated with Telegram.";
    }
    return { success: true, needsPassword: false };
  } catch (error) {
    if (callbacks.abortSignal?.aborted) {
      return { success: false, needsPassword: false };
    }
    console.error("[QR AUTH FLOW] Failed:", error);
    const message = getTelegramErrorMessage(error);
    if (toast) {
      toast.style = Toast.Style.Failure;
      toast.title = "Authentication Failed";
      toast.message = message;
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication Failed",
        message,
      });
    }
    throw new Error(message);
  }
}
